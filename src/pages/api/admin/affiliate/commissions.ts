/**
 * GET /api/admin/affiliate/commissions?status=&from=&to=&page=1&per_page=30
 * Ledger des commissions
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
  const status = req.query.status as string | undefined
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const perPage = Math.min(100, parseInt(req.query.per_page as string) || 30)
  const offset = (page - 1) * perPage

  try {
    let query = supabase
      .from('affiliate_commissions')
      .select('id, affiliate_id, lead_id, plan_type, commission_amount, status, created_at, confirmed_at, paid_at, revoked_at, revoke_reason', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (status) query = query.eq('status', status)
    if (from) query = query.gte('created_at', `${from}T00:00:00Z`)
    if (to) query = query.lte('created_at', `${to}T23:59:59Z`)

    const { data: commissions, count } = await query

    // Enrichir avec les codes affiliés
    const affIds = Array.from(new Set((commissions || []).map(c => c.affiliate_id)))
    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('id, code, custom_code')
      .in('id', affIds.length > 0 ? affIds : ['00000000-0000-0000-0000-000000000000'])

    const affMap = new Map((affiliates || []).map(a => [a.id, a.custom_code || a.code]))

    const enriched = (commissions || []).map(c => ({
      commission_id: c.id,
      affiliate_code: affMap.get(c.affiliate_id) || '—',
      lead_id: c.lead_id,
      plan_type: c.plan_type,
      amount: c.commission_amount,
      status: c.status,
      created_at: c.created_at,
      confirmed_at: c.confirmed_at,
      paid_at: c.paid_at,
      revoked_at: c.revoked_at,
      revoke_reason: c.revoke_reason,
    }))

    // Totaux
    const totalAmount = (commissions || []).reduce((s, c) => s + (c.commission_amount || 0), 0)

    return res.status(200).json({
      success: true,
      data: {
        commissions: enriched,
        totals: { total_amount: totalAmount, count: count || 0 },
        pagination: {
          page,
          per_page: perPage,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / perPage),
        },
      },
    })
  } catch (error) {
    console.error('[ADMIN AFFILIATE COMMISSIONS] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

