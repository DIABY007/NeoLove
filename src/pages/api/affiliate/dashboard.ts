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
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non authentifié' })
  }

  const supabase = getServiceSupabase()

  try {
    // Récupérer le compte affilié
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // Si la table n'existe pas ou pas de compte affilié
    if (affError) {
      // Table manquante — pas une erreur critique, juste pas encore affilié
      if (affError.code === '42P01' || affError.message?.includes('does not exist')) {
        return res.status(404).json({ success: false, error: 'Pas de compte partenaire' })
      }
      console.error('[AFFILIATE DASHBOARD] Erreur:', affError)
      return res.status(500).json({ success: false, error: affError.message })
    }

    if (!affiliate) {
      return res.status(404).json({ success: false, error: 'Pas de compte partenaire' })
    }

    // Récupérer les leads (anonymisés : uniquement date, statut, commission)
    const { data: leads } = await supabase
      .from('affiliate_leads')
      .select('id, status, quality_score, created_at')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Récupérer les commissions
    const { data: commissions } = await supabase
      .from('affiliate_commissions')
      .select('id, plan_type, commission_amount, status, created_at, confirmed_at')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Récupérer les payouts
    const { data: payouts } = await supabase
      .from('affiliate_payouts')
      .select('id, amount, status, requested_at, processed_at')
      .eq('affiliate_id', affiliate.id)
      .order('requested_at', { ascending: false })
      .limit(10)

    // Calculer les KPIs agrégés
    const totalLeads = affiliate.leads_count || 0
    const activeLeads = (leads || []).filter(l => l.status === 'active' || l.status === 'subscribed').length
    const subscribedLeads = (leads || []).filter(l => l.status === 'subscribed').length
    const conversionRate = totalLeads > 0 ? Math.round((subscribedLeads / totalLeads) * 100) : 0

    // Activité récente (anonymisée) pour le dashboard
    const recentActivity = (leads || []).slice(0, 10).map((lead, i) => ({
      id: lead.id,
      index: i + 1,
      status: lead.status,
      date: lead.created_at,
      commission: (commissions || []).find(c => c.status !== 'revoked')?.commission_amount || 0,
    }))

    return res.status(200).json({
      success: true,
      data: {
        affiliate: {
          id: affiliate.id,
          code: affiliate.custom_code || affiliate.code,
          status: affiliate.status,
          balance_available: affiliate.balance_available,
          balance_pending: affiliate.balance_pending,
          total_earned: affiliate.total_earned,
          total_paid: affiliate.total_paid,
          created_at: affiliate.created_at,
        },
        kpis: {
          total_leads: totalLeads,
          active_leads: activeLeads,
          subscribed_leads: subscribedLeads,
          conversion_rate: conversionRate,
          commission_available: affiliate.balance_available,
          commission_pending: affiliate.balance_pending,
          total_earned: affiliate.total_earned,
          total_paid: affiliate.total_paid,
        },
        recent_activity: recentActivity,
        commissions: (commissions || []).map(c => ({
          id: c.id,
          plan_type: c.plan_type,
          amount: c.commission_amount,
          status: c.status,
          date: c.created_at,
        })),
        payouts: payouts || [],
      },
    })
  } catch (error) {
    console.error('[AFFILIATE DASHBOARD] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

