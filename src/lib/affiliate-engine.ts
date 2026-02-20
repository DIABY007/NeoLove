/**
 * Affiliate Engine — Logique métier d'affiliation côté serveur
 *
 * - Génération de codes uniques
 * - Calcul de commissions (1K/2K/4K selon plan)
 * - Anti-fraude : fingerprint, IP velocity, duplicate detection, quality scoring
 * - Attribution et révocation de commissions
 * - Audit logging immutable
 */

import crypto from 'crypto'
import { getServiceSupabase } from './supabase'

// ════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════

/** Commissions en FCFA par type de plan */
export const COMMISSION_MAP: Record<string, number> = {
  standard: 1000,   // 1K sur 5K
  premium: 2000,    // 2K sur 12K
  vip: 4000,        // 4K sur 20K
  trial: 0,         // Pas de commission sur l'essai gratuit
}

/** Seuils anti-fraude */
const FRAUD_CONFIG = {
  maxLeadsPerIPPerDay: 3,
  maxLeadsPerDevicePerDay: 2,
  minQualityScore: 0.4,
  selfReferralBlockEnabled: true,
  duplicatePhoneBlockEnabled: true,
}

// ════════════════════════════════════════
// CODE GENERATION
// ════════════════════════════════════════

/**
 * Générer un code affilié unique type NEO-XXXX
 */
export function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // Exclus I,O,0,1 pour lisibilité
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[crypto.randomInt(chars.length)]
  }
  return `NEO-${code}`
}

/**
 * Valider un code personnalisé (3-12 caractères alphanumériques + tirets)
 */
export function validateCustomCode(code: string): boolean {
  return /^[A-Z0-9-]{3,16}$/.test(code.toUpperCase())
}

// ════════════════════════════════════════
// HASHING HELPERS
// ════════════════════════════════════════

export function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone.trim().toLowerCase()).digest('hex').slice(0, 32)
}

export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

// ════════════════════════════════════════
// ANTI-FRAUDE
// ════════════════════════════════════════

export interface FraudCheckResult {
  passed: boolean
  quality_score: number
  flags: string[]
  should_review: boolean
}

/**
 * Exécuter les vérifications anti-fraude sur un lead entrant
 */
export async function runFraudChecks(
  affiliateId: string,
  affiliateUserId: string,
  phoneHash: string,
  ipHash: string,
  deviceFingerprint: string,
  referredUserId: string
): Promise<FraudCheckResult> {
  const supabase = getServiceSupabase()
  const flags: string[] = []
  let qualityScore = 1.0
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // Check 1 : Auto-parrainage (même user_id)
  if (FRAUD_CONFIG.selfReferralBlockEnabled && referredUserId === affiliateUserId) {
    flags.push('self_referral')
    qualityScore -= 0.8
  }

  // Check 2 : Numéro déjà parrainé
  if (FRAUD_CONFIG.duplicatePhoneBlockEnabled) {
    const { count } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .eq('phone_hash', phoneHash)

    if ((count ?? 0) > 0) {
      flags.push('duplicate_phone')
      qualityScore -= 0.6
    }
  }

  // Check 3 : IP velocity (trop de leads depuis même IP en 24h)
  if (ipHash) {
    const { count } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', dayAgo)

    if ((count ?? 0) >= FRAUD_CONFIG.maxLeadsPerIPPerDay) {
      flags.push('ip_velocity')
      qualityScore -= 0.3
    }
  }

  // Check 4 : Device fingerprint velocity
  if (deviceFingerprint) {
    const { count } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .eq('device_fingerprint', deviceFingerprint)
      .gte('created_at', dayAgo)

    if ((count ?? 0) >= FRAUD_CONFIG.maxLeadsPerDevicePerDay) {
      flags.push('device_velocity')
      qualityScore -= 0.3
    }
  }

  // Normaliser score
  qualityScore = Math.max(0, Math.min(1, qualityScore))

  const shouldReview = flags.length > 0 && qualityScore >= FRAUD_CONFIG.minQualityScore
  const passed = qualityScore >= FRAUD_CONFIG.minQualityScore && !flags.includes('self_referral')

  return { passed, quality_score: qualityScore, flags, should_review: shouldReview }
}

// ════════════════════════════════════════
// COMMISSION
// ════════════════════════════════════════

/**
 * Calculer la commission pour un plan donné
 */
export function getCommissionAmount(planType: string): number {
  return COMMISSION_MAP[planType] || 0
}

/**
 * Attribuer une commission à un affilié lors de l'activation d'une licence
 * par un filleul (lead référé)
 */
export async function attributeCommission(
  affiliateId: string,
  leadId: string,
  licenseId: string,
  planType: string
): Promise<{ success: boolean; commission_amount: number; status: string }> {
  const supabase = getServiceSupabase()
  const commissionAmount = getCommissionAmount(planType)

  if (commissionAmount === 0) {
    return { success: true, commission_amount: 0, status: 'no_commission' }
  }

  // Vérifier la qualité du lead
  const { data: lead } = await supabase
    .from('affiliate_leads')
    .select('quality_score, status, is_duplicate')
    .eq('id', leadId)
    .single()

  if (!lead) {
    return { success: false, commission_amount: 0, status: 'lead_not_found' }
  }

  // Bloquer si lead de mauvaise qualité ou dupliqué
  if (lead.is_duplicate || (lead.quality_score !== null && lead.quality_score < FRAUD_CONFIG.minQualityScore)) {
    await logAuditEvent(affiliateId, 'commission_blocked', {
      lead_id: leadId,
      reason: lead.is_duplicate ? 'duplicate' : 'low_quality',
      quality_score: lead.quality_score,
    })
    return { success: false, commission_amount: 0, status: 'blocked_quality' }
  }

  // Créer la commission (initialement pending, confirmée après 7 jours sans remboursement)
  const { error: insertError } = await supabase
    .from('affiliate_commissions')
    .insert({
      affiliate_id: affiliateId,
      lead_id: leadId,
      license_id: licenseId,
      plan_type: planType,
      commission_amount: commissionAmount,
      status: 'confirmed', // Direct pour MVP, ajouter pending+confirm plus tard
      confirmed_at: new Date().toISOString(),
    })

  if (insertError) {
    console.error('[AFFILIATE] Erreur insertion commission:', insertError)
    return { success: false, commission_amount: 0, status: 'insert_error' }
  }

  // Mettre à jour le solde de l'affilié
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('balance_available, total_earned, conversions_count')
    .eq('id', affiliateId)
    .single()

  if (affiliate) {
    await supabase
      .from('affiliates')
      .update({
        balance_available: affiliate.balance_available + commissionAmount,
        total_earned: affiliate.total_earned + commissionAmount,
        conversions_count: affiliate.conversions_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateId)
  }

  // Mettre à jour le lead
  await supabase
    .from('affiliate_leads')
    .update({ status: 'subscribed' })
    .eq('id', leadId)

  // Audit
  await logAuditEvent(affiliateId, 'commission_attributed', {
    lead_id: leadId,
    license_id: licenseId,
    plan_type: planType,
    amount: commissionAmount,
  })

  return { success: true, commission_amount: commissionAmount, status: 'confirmed' }
}

// ════════════════════════════════════════
// AUDIT LOGGING
// ════════════════════════════════════════

export async function logAuditEvent(
  affiliateId: string,
  action: string,
  details: Record<string, unknown> = {},
  ipAddress?: string
): Promise<void> {
  const supabase = getServiceSupabase()
  try {
    await supabase.from('affiliate_audit_logs').insert({
      affiliate_id: affiliateId,
      action,
      details,
      ip_address: ipAddress || null,
    })
  } catch (err) {
    console.error('[AFFILIATE AUDIT] Erreur log:', err)
  }
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

/**
 * Trouver un affilié par son code (code principal ou custom_code)
 */
export async function findAffiliateByCode(code: string): Promise<{
  id: string
  user_id: string
  code: string
  status: string
} | null> {
  const supabase = getServiceSupabase()
  const upper = code.toUpperCase().trim()

  // Chercher par code principal
  const { data: byCode } = await supabase
    .from('affiliates')
    .select('id, user_id, code, status')
    .eq('code', upper)
    .eq('status', 'active')
    .single()

  if (byCode) return byCode

  // Chercher par code personnalisé
  const { data: byCustom } = await supabase
    .from('affiliates')
    .select('id, user_id, code, status')
    .eq('custom_code', upper)
    .eq('status', 'active')
    .single()

  return byCustom || null
}

/**
 * Enregistrer un lead (inscription via code affilié)
 */
export async function registerAffiliateLead(
  affiliateId: string,
  affiliateUserId: string,
  referredUserId: string,
  phoneHash: string,
  ipHash: string,
  deviceFingerprint: string
): Promise<{ success: boolean; lead_id?: string; status: string; quality_score?: number }> {
  const supabase = getServiceSupabase()

  // Anti-fraude
  const fraudResult = await runFraudChecks(
    affiliateId,
    affiliateUserId,
    phoneHash,
    ipHash,
    deviceFingerprint,
    referredUserId
  )

  const leadStatus = !fraudResult.passed
    ? 'rejected'
    : fraudResult.should_review
      ? 'review'
      : 'registered'

  // Insérer le lead
  const { data: lead, error: insertError } = await supabase
    .from('affiliate_leads')
    .insert({
      affiliate_id: affiliateId,
      referred_user_id: referredUserId,
      phone_hash: phoneHash,
      ip_hash: ipHash,
      device_fingerprint: deviceFingerprint || null,
      quality_score: fraudResult.quality_score,
      status: leadStatus,
      is_duplicate: fraudResult.flags.includes('duplicate_phone'),
    })
    .select('id')
    .single()

  if (insertError || !lead) {
    console.error('[AFFILIATE] Erreur enregistrement lead:', insertError)
    return { success: false, status: 'error' }
  }

  // Incrémenter le compteur leads de l'affilié
  const { data: aff } = await supabase
    .from('affiliates')
    .select('leads_count')
    .eq('id', affiliateId)
    .single()

  if (aff) {
    await supabase
      .from('affiliates')
      .update({
        leads_count: aff.leads_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliateId)
  }

  // Marquer l'utilisateur comme référé
  await supabase
    .from('users')
    .update({ referred_by: affiliateId })
    .eq('id', referredUserId)

  // Audit
  await logAuditEvent(affiliateId, 'lead_registered', {
    lead_id: lead.id,
    referred_user_id: referredUserId,
    quality_score: fraudResult.quality_score,
    flags: fraudResult.flags,
    status: leadStatus,
  })

  return {
    success: fraudResult.passed,
    lead_id: lead.id,
    status: leadStatus,
    quality_score: fraudResult.quality_score,
  }
}

// ════════════════════════════════════════
// WHATSAPP PAYOUT LINK
// ════════════════════════════════════════

const ADMIN_WHATSAPP = '+22656636039'

export function buildPayoutWhatsAppUrl(affiliateCode: string, amount: number): string {
  const message = `Bonjour, je suis partenaire NeoLove (code: ${affiliateCode}). Je souhaite récupérer ma commission de ${amount.toLocaleString('fr-FR')} FCFA. Merci de me contacter pour le paiement par Mobile Money.`
  const num = ADMIN_WHATSAPP.replace('+', '')
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

// ════════════════════════════════════════
// MESSAGES PRÊTS À PARTAGER
// ════════════════════════════════════════

export function getShareMessages(code: string, appUrl: string): { label: string; text: string }[] {
  const link = `${appUrl}/?ref=${code}`
  return [
    {
      label: 'Message direct',
      text: `Yo ! J'utilise NeoLove pour mieux répondre aux messages et c'est un game-changer 🔥 Teste avec mon lien : ${link}`,
    },
    {
      label: 'Message pro',
      text: `Salut, j'ai découvert NeoLove — un assistant qui aide à répondre aux messages de manière percutante. Essaie gratuitement : ${link}`,
    },
    {
      label: 'Message drôle',
      text: `Tu galères en DM ? NeoLove te sauve la mise 😂 3 jours gratuits ici : ${link}`,
    },
    {
      label: 'Message court',
      text: `Teste NeoLove gratuitement 👉 ${link}`,
    },
    {
      label: 'Story/statut',
      text: `NeoLove — l'assistant qui te fait briller en conversation ✨ Lien dans la bio ou ici : ${link}`,
    },
    {
      label: 'Groupe WhatsApp',
      text: `🚀 NeoLove c'est l'app qui te génère des réponses parfaites pour tes conversations. 3 jours offerts ! ${link}`,
    },
  ]
}

