/**
 * GET /api/admin/affiliate/alerts
 * Règles d'alerte actives et incidents détectés
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  rule: string
  message: string
  value: number
  threshold: number
  triggered: boolean
  details?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  const user = await getAuthenticatedUser(req)
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès refusé' })
  }

  const supabase = getServiceSupabase()
  const alerts: Alert[] = []

  try {
    // ── Alerte 1: Fraud flags > 5 en 24h ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: fraudCount24h } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .in('status', ['review', 'rejected'])
      .gte('created_at', twentyFourHoursAgo)

    alerts.push({
      id: 'fraud_spike_24h',
      severity: (fraudCount24h || 0) > 5 ? 'critical' : 'info',
      rule: 'fraud_flags > 5 en 24h',
      message: (fraudCount24h || 0) > 5
        ? `🚨 ${fraudCount24h} leads flaggés en 24h — Investigation requise`
        : `${fraudCount24h || 0} leads flaggés en 24h — Normal`,
      value: fraudCount24h || 0,
      threshold: 5,
      triggered: (fraudCount24h || 0) > 5,
    })

    // ── Alerte 2: Conversion rate < 5% sur 7 jours ──
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { count: leads7d } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo)

    const { count: paid7d } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'subscribed')
      .gte('created_at', sevenDaysAgo)

    const convRate7d = (leads7d || 0) > 0
      ? ((paid7d || 0) / (leads7d || 1))
      : 0

    alerts.push({
      id: 'low_conversion_7d',
      severity: convRate7d < 0.05 && (leads7d || 0) > 10 ? 'warning' : 'info',
      rule: 'conversion_rate < 5% sur 7 jours',
      message: convRate7d < 0.05 && (leads7d || 0) > 10
        ? `⚠️ Taux de conversion faible : ${(convRate7d * 100).toFixed(1)}% (${paid7d}/${leads7d})`
        : `Taux de conversion : ${(convRate7d * 100).toFixed(1)}% (${paid7d || 0}/${leads7d || 0})`,
      value: Math.round(convRate7d * 1000) / 10,
      threshold: 5,
      triggered: convRate7d < 0.05 && (leads7d || 0) > 10,
    })

    // ── Alerte 3: Commission accrued > 50K non payée depuis 30 jours ──
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: unpaidAffiliates } = await supabase
      .from('affiliates')
      .select('id, code, custom_code, balance_available')
      .gt('balance_available', 50000)

    const hasUnpaidHigh = (unpaidAffiliates || []).length > 0
    const totalUnpaid = (unpaidAffiliates || []).reduce((s, a) => s + (a.balance_available || 0), 0)

    alerts.push({
      id: 'unpaid_commissions_30d',
      severity: hasUnpaidHigh ? 'warning' : 'info',
      rule: 'commission_accrued > 50K non payée',
      message: hasUnpaidHigh
        ? `⚠️ ${(unpaidAffiliates || []).length} affilié(s) avec balance > 50K FCFA — Finance review`
        : 'Aucun affilié avec balance non payée élevée',
      value: totalUnpaid,
      threshold: 50000,
      triggered: hasUnpaidHigh,
      details: hasUnpaidHigh ? `Affiliés: ${(unpaidAffiliates || []).map(a => a.custom_code || a.code).join(', ')}` : undefined,
    })

    // ── Alerte 4: Pic de leads depuis même IP range ──
    const { data: ipLeads } = await supabase
      .from('affiliate_leads')
      .select('ip_hash')
      .gte('created_at', twentyFourHoursAgo)
      .not('ip_hash', 'is', null)

    // Compter les duplications IP
    const ipCounts: Record<string, number> = {}
    for (const lead of ipLeads || []) {
      if (lead.ip_hash) {
        const prefix = lead.ip_hash.slice(0, 8)
        ipCounts[prefix] = (ipCounts[prefix] || 0) + 1
      }
    }
    const suspiciousIPs = Object.entries(ipCounts).filter(([, count]) => count > 10)

    alerts.push({
      id: 'ip_velocity_spike',
      severity: suspiciousIPs.length > 0 ? 'critical' : 'info',
      rule: 'Pic de leads depuis même IP range (>10 en 24h)',
      message: suspiciousIPs.length > 0
        ? `🚨 ${suspiciousIPs.length} plage(s) IP suspecte(s) — ${suspiciousIPs.map(([ip, count]) => `${ip}…(${count})`).join(', ')}`
        : 'Aucune activité IP suspecte',
      value: suspiciousIPs.length,
      threshold: 1,
      triggered: suspiciousIPs.length > 0,
    })

    // ── Alerte 5: Leads duplicate élevés ──
    const { count: duplicateCount } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .eq('is_duplicate', true)
      .gte('created_at', sevenDaysAgo)

    alerts.push({
      id: 'duplicate_leads_7d',
      severity: (duplicateCount || 0) > 20 ? 'warning' : 'info',
      rule: 'Leads dupliqués > 20 sur 7 jours',
      message: (duplicateCount || 0) > 20
        ? `⚠️ ${duplicateCount} leads dupliqués détectés en 7 jours`
        : `${duplicateCount || 0} leads dupliqués en 7 jours`,
      value: duplicateCount || 0,
      threshold: 20,
      triggered: (duplicateCount || 0) > 20,
    })

    // ── Alerte 6: Payout requests en attente > 3 jours ──
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    const { count: stalePayout } = await supabase
      .from('affiliate_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'requested')
      .lte('requested_at', threeDaysAgo)

    alerts.push({
      id: 'stale_payouts',
      severity: (stalePayout || 0) > 0 ? 'warning' : 'info',
      rule: 'Payout requests en attente > 3 jours',
      message: (stalePayout || 0) > 0
        ? `⚠️ ${stalePayout} demande(s) de paiement en attente depuis +3 jours`
        : 'Aucune demande de paiement en retard',
      value: stalePayout || 0,
      threshold: 1,
      triggered: (stalePayout || 0) > 0,
    })

    // Trier : triggered en premier, puis par severity
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => {
      if (a.triggered !== b.triggered) return a.triggered ? -1 : 1
      return severityOrder[a.severity] - severityOrder[b.severity]
    })

    return res.status(200).json({
      success: true,
      data: {
        alerts,
        triggered_count: alerts.filter(a => a.triggered).length,
        total_rules: alerts.length,
      },
    })
  } catch (error) {
    console.error('[ADMIN AFFILIATE ALERTS] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

