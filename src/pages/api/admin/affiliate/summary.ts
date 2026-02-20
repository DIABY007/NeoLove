/**
 * GET /api/admin/affiliate/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Résumé des KPIs du programme d'affiliation
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'

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
  const from = (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const to = (req.query.to as string) || new Date().toISOString().slice(0, 10)
  const fromDate = `${from}T00:00:00Z`
  const toDate = `${to}T23:59:59Z`

  try {
    // Partenaires actifs
    const { count: partnersCount } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Partenaires total
    const { count: partnersTotal } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })

    // Leads via affiliate (période)
    const { count: leadsCount } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromDate)
      .lte('created_at', toDate)

    // Leads total
    const { count: leadsTotal } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })

    // Leads subscribed (licences payées via affiliate) — période
    const { count: paidLeadsPeriod } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'subscribed')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)

    // Leads subscribed total
    const { count: paidLeadsTotal } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'subscribed')

    // Commissions accrued (pending + confirmed)
    const { data: accruedData } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount')
      .in('status', ['pending', 'confirmed'])

    const commissionAccrued = (accruedData || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0)

    // Commissions paid
    const { data: paidData } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount')
      .eq('status', 'paid')

    const commissionPaid = (paidData || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0)

    // Commissions période
    const { data: accruedPeriodData } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount')
      .in('status', ['pending', 'confirmed'])
      .gte('created_at', fromDate)
      .lte('created_at', toDate)

    const commissionAccruedPeriod = (accruedPeriodData || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0)

    // Fraud flags
    const { count: fraudFlags } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .in('status', ['review', 'rejected'])

    // Fraud flags période
    const { count: fraudFlagsPeriod } = await supabase
      .from('affiliate_leads')
      .select('*', { count: 'exact', head: true })
      .in('status', ['review', 'rejected'])
      .gte('created_at', fromDate)
      .lte('created_at', toDate)

    // Conversion rate
    const conversionRate = (leadsTotal || 0) > 0
      ? ((paidLeadsTotal || 0) / (leadsTotal || 1))
      : 0

    // Avg commission per affiliate
    const avgCommission = (partnersCount || 0) > 0
      ? Math.round(commissionAccrued / (partnersCount || 1))
      : 0

    // Payout requests pending
    const { count: payoutsPending } = await supabase
      .from('affiliate_payouts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['requested', 'processing'])

    // Payout total paid
    const { data: payoutPaidData } = await supabase
      .from('affiliate_payouts')
      .select('amount')
      .eq('status', 'paid')

    const totalPayoutPaid = (payoutPaidData || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    // Commission par plan (breakdown)
    const { data: commByPlan } = await supabase
      .from('affiliate_commissions')
      .select('plan_type, commission_amount, status')

    const planBreakdown: Record<string, { count: number; total: number }> = {}
    for (const c of commByPlan || []) {
      if (!planBreakdown[c.plan_type]) planBreakdown[c.plan_type] = { count: 0, total: 0 }
      planBreakdown[c.plan_type].count++
      planBreakdown[c.plan_type].total += c.commission_amount || 0
    }

    return res.status(200).json({
      success: true,
      data: {
        period: { from, to },
        kpis: {
          partners_active: partnersCount || 0,
          partners_total: partnersTotal || 0,
          leads_via_affiliate: leadsTotal || 0,
          leads_period: leadsCount || 0,
          paid_licenses_via_affiliate: paidLeadsTotal || 0,
          paid_licenses_period: paidLeadsPeriod || 0,
          commission_accrued: commissionAccrued,
          commission_accrued_period: commissionAccruedPeriod,
          commission_paid: commissionPaid,
          conversion_rate_affiliate: Math.round(conversionRate * 1000) / 10,
          avg_commission_per_affiliate: avgCommission,
          fraud_flags: fraudFlags || 0,
          fraud_flags_period: fraudFlagsPeriod || 0,
          payouts_pending: payoutsPending || 0,
          total_payout_paid: totalPayoutPaid,
        },
        plan_breakdown: planBreakdown,
      },
    })
  } catch (error) {
    console.error('[ADMIN AFFILIATE SUMMARY] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

