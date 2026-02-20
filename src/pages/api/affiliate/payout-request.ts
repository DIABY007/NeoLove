import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { logAuditEvent, buildPayoutWhatsAppUrl } from '@/lib/affiliate-engine'
import type { ApiResponse } from '@/lib/types'

const PayoutSchema = z.object({
  amount: z.number().min(1000, 'Minimum 1 000 FCFA'),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  const user = await getAuthenticatedUser(req)
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non authentifié' })
  }

  const validation = PayoutSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.errors[0]?.message || 'Données invalides',
    })
  }

  const { amount } = validation.data
  const supabase = getServiceSupabase()

  try {
    // Récupérer le compte affilié
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, code, custom_code, balance_available, status')
      .eq('user_id', user.id)
      .single()

    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Pas de compte partenaire' })
    }

    if (affiliate.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Compte partenaire suspendu' })
    }

    // Vérifier le solde
    if (amount > affiliate.balance_available) {
      return res.status(400).json({
        success: false,
        error: `Solde insuffisant. Disponible : ${affiliate.balance_available.toLocaleString('fr-FR')} FCFA`,
      })
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const { data: pendingPayout } = await supabase
      .from('affiliate_payouts')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .in('status', ['requested', 'processing'])
      .limit(1)

    if (pendingPayout && pendingPayout.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Vous avez déjà une demande de paiement en cours.',
      })
    }

    // Créer la demande de paiement
    const { data: payout, error: insertError } = await supabase
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliate.id,
        amount,
        status: 'requested',
      })
      .select('id')
      .single()

    if (insertError || !payout) {
      console.error('[AFFILIATE PAYOUT] Erreur:', insertError)
      return res.status(500).json({ success: false, error: 'Erreur lors de la demande' })
    }

    // Audit log
    await logAuditEvent(affiliate.id, 'payout_requested', {
      payout_id: payout.id,
      amount,
    })

    // Construire le lien WhatsApp
    const affiliateCode = affiliate.custom_code || affiliate.code
    const whatsappUrl = buildPayoutWhatsAppUrl(affiliateCode, amount)

    return res.status(200).json({
      success: true,
      data: {
        payout_id: payout.id,
        amount,
        whatsapp_url: whatsappUrl,
        message: `Demande de paiement de ${amount.toLocaleString('fr-FR')} FCFA envoyée.`,
      },
    })
  } catch (error) {
    console.error('[AFFILIATE PAYOUT] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

