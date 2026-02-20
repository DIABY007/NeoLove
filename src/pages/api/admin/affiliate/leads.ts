/**
 * GET /api/admin/affiliate/leads?affiliate_id=&status=&page=1&per_page=30
 * Liste anonymisée de leads (pas de PII)
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
  const affiliateId = req.query.affiliate_id as string | undefined
  const status = req.query.status as string | undefined
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const perPage = Math.min(100, parseInt(req.query.per_page as string) || 30)
  const offset = (page - 1) * perPage

  try {
    // Construire la query
    let query = supabase
      .from('affiliate_leads')
      .select('id, affiliate_id, status, quality_score, is_duplicate, ip_hash, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (affiliateId) {
      query = query.eq('affiliate_id', affiliateId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: leads, count } = await query

    // Récupérer les codes affiliés pour enrichissement
    const affIds = Array.from(new Set((leads || []).map(l => l.affiliate_id)))
    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('id, code, custom_code')
      .in('id', affIds.length > 0 ? affIds : ['00000000-0000-0000-0000-000000000000'])

    const affMap = new Map((affiliates || []).map(a => [a.id, a.custom_code || a.code]))

    // Anonymiser : uniquement date, status, quality, commission
    const anonymized = (leads || []).map(l => ({
      lead_id: l.id,
      affiliate_code: affMap.get(l.affiliate_id) || '—',
      status: l.status,
      quality_score: l.quality_score,
      is_duplicate: l.is_duplicate,
      ip_hash_prefix: l.ip_hash ? l.ip_hash.slice(0, 6) + '…' : null,
      date: l.created_at,
    }))

    return res.status(200).json({
      success: true,
      data: {
        leads: anonymized,
        pagination: {
          page,
          per_page: perPage,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / perPage),
        },
      },
    })
  } catch (error) {
    console.error('[ADMIN AFFILIATE LEADS] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

