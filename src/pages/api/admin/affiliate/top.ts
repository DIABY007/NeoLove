/**
 * GET /api/admin/affiliate/top?metric=leads|commissions|conversions&limit=20
 * Top affiliés classés par métrique
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
  const metric = (req.query.metric as string) || 'commissions'
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  try {
    // Récupérer tous les affiliés avec leurs stats
    const orderColumn = metric === 'leads' ? 'leads_count'
      : metric === 'conversions' ? 'conversions_count'
      : 'total_earned'

    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('id, code, custom_code, status, leads_count, conversions_count, total_earned, balance_available, balance_pending, created_at')
      .order(orderColumn, { ascending: false })
      .limit(limit)

    if (!affiliates) {
      return res.status(200).json({ success: true, data: { affiliates: [] } })
    }

    // Pour chaque affilié, obtenir les détails agrégés (sans PII)
    const enriched = await Promise.all(
      affiliates.map(async (aff) => {
        // Qualité moyenne des leads
        const { data: qualityData } = await supabase
          .from('affiliate_leads')
          .select('quality_score')
          .eq('affiliate_id', aff.id)
          .not('quality_score', 'is', null)

        const avgQuality = qualityData && qualityData.length > 0
          ? Math.round((qualityData.reduce((s, l) => s + (l.quality_score || 0), 0) / qualityData.length) * 100) / 100
          : null

        // Fraud count
        const { count: fraudCount } = await supabase
          .from('affiliate_leads')
          .select('*', { count: 'exact', head: true })
          .eq('affiliate_id', aff.id)
          .in('status', ['review', 'rejected'])

        // Conversion rate
        const convRate = aff.leads_count > 0
          ? Math.round((aff.conversions_count / aff.leads_count) * 1000) / 10
          : 0

        return {
          affiliate_id: aff.id,
          code: aff.custom_code || aff.code,
          status: aff.status,
          leads_count: aff.leads_count,
          conversions_count: aff.conversions_count,
          conversion_rate: convRate,
          total_earned: aff.total_earned,
          balance_available: aff.balance_available,
          avg_quality_score: avgQuality,
          fraud_flags: fraudCount || 0,
          created_at: aff.created_at,
        }
      })
    )

    return res.status(200).json({
      success: true,
      data: { affiliates: enriched, metric, limit },
    })
  } catch (error) {
    console.error('[ADMIN AFFILIATE TOP] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

