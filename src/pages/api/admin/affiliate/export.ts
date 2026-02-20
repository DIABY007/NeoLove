/**
 * GET /api/admin/affiliate/export?format=csv|json&scope=summary|leads|commissions|payouts&from=&to=
 * Export reporting financier et audit
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  const user = await getAuthenticatedUser(req)
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès refusé' })
  }

  const supabase = getServiceSupabase()
  const format = (req.query.format as string) || 'json'
  const scope = (req.query.scope as string) || 'summary'
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined

  try {
    let data: Record<string, unknown>[] = []
    let filename = `affiliate_${scope}_${new Date().toISOString().slice(0, 10)}`

    switch (scope) {
      case 'summary': {
        // Monthly affiliate ledger
        const { data: affiliates } = await supabase
          .from('affiliates')
          .select('id, code, custom_code, status, leads_count, conversions_count, total_earned, balance_available, created_at')
          .order('total_earned', { ascending: false })

        data = (affiliates || []).map(a => ({
          affiliate_id: a.id,
          code: a.custom_code || a.code,
          status: a.status,
          leads_count: a.leads_count,
          conversions_count: a.conversions_count,
          total_earned: a.total_earned,
          balance_available: a.balance_available,
          created_at: a.created_at,
        }))
        filename = `affiliate_ledger_${new Date().toISOString().slice(0, 10)}`
        break
      }

      case 'leads': {
        let query = supabase
          .from('affiliate_leads')
          .select('id, affiliate_id, status, quality_score, is_duplicate, ip_hash, created_at')
          .order('created_at', { ascending: false })
          .limit(5000)

        if (from) query = query.gte('created_at', `${from}T00:00:00Z`)
        if (to) query = query.lte('created_at', `${to}T23:59:59Z`)

        const { data: leads } = await query

        // Enrichir avec codes affiliés
        const affIds = Array.from(new Set((leads || []).map(l => l.affiliate_id)))
        const { data: affiliates } = await supabase
          .from('affiliates')
          .select('id, code, custom_code')
          .in('id', affIds.length > 0 ? affIds : ['00000000-0000-0000-0000-000000000000'])

        const affMap = new Map((affiliates || []).map(a => [a.id, a.custom_code || a.code]))

        data = (leads || []).map(l => ({
          lead_id: l.id,
          affiliate_code: affMap.get(l.affiliate_id) || '—',
          status: l.status,
          quality_score: l.quality_score,
          is_duplicate: l.is_duplicate,
          ip_hash_prefix: l.ip_hash ? l.ip_hash.slice(0, 6) : null,
          date: l.created_at,
        }))
        break
      }

      case 'commissions': {
        let query = supabase
          .from('affiliate_commissions')
          .select('id, affiliate_id, lead_id, plan_type, commission_amount, status, created_at, confirmed_at, paid_at, revoked_at, revoke_reason')
          .order('created_at', { ascending: false })
          .limit(5000)

        if (from) query = query.gte('created_at', `${from}T00:00:00Z`)
        if (to) query = query.lte('created_at', `${to}T23:59:59Z`)

        const { data: commissions } = await query

        const affIds = Array.from(new Set((commissions || []).map(c => c.affiliate_id)))
        const { data: affiliates } = await supabase
          .from('affiliates')
          .select('id, code, custom_code')
          .in('id', affIds.length > 0 ? affIds : ['00000000-0000-0000-0000-000000000000'])

        const affMap = new Map((affiliates || []).map(a => [a.id, a.custom_code || a.code]))

        data = (commissions || []).map(c => ({
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
        break
      }

      case 'payouts': {
        let query = supabase
          .from('affiliate_payouts')
          .select('id, affiliate_id, amount, status, payment_method, requested_at, processed_at')
          .order('requested_at', { ascending: false })
          .limit(5000)

        if (from) query = query.gte('requested_at', `${from}T00:00:00Z`)
        if (to) query = query.lte('requested_at', `${to}T23:59:59Z`)

        const { data: payouts } = await query

        const affIds = Array.from(new Set((payouts || []).map(p => p.affiliate_id)))
        const { data: affiliates } = await supabase
          .from('affiliates')
          .select('id, code, custom_code')
          .in('id', affIds.length > 0 ? affIds : ['00000000-0000-0000-0000-000000000000'])

        const affMap = new Map((affiliates || []).map(a => [a.id, a.custom_code || a.code]))

        data = (payouts || []).map(p => ({
          payout_id: p.id,
          affiliate_code: affMap.get(p.affiliate_id) || '—',
          amount: p.amount,
          status: p.status,
          method: p.payment_method,
          requested_at: p.requested_at,
          processed_at: p.processed_at,
        }))
        filename = `affiliate_payouts_${new Date().toISOString().slice(0, 10)}`
        break
      }

      default:
        return res.status(400).json({ success: false, error: `Scope invalide: ${scope}` })
    }

    // ── Format CSV ──
    if (format === 'csv') {
      if (data.length === 0) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
        return res.status(200).send('Aucune donnée')
      }

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => {
            const val = row[h]
            if (val === null || val === undefined) return ''
            const str = String(val)
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str
          }).join(',')
        ),
      ]

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
      return res.status(200).send(csvRows.join('\n'))
    }

    // ── Format JSON ──
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
    return res.status(200).json({
      success: true,
      data: {
        export_date: new Date().toISOString(),
        scope,
        count: data.length,
        records: data,
      },
    })
  } catch (error) {
    console.error('[ADMIN AFFILIATE EXPORT] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

