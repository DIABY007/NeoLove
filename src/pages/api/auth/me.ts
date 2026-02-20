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

  // Récupérer la licence active avec la date d'expiration la plus lointaine
  const supabase = getServiceSupabase()
  const { data: activeLicenses } = await supabase
    .from('licenses')
    .select('id, plan_type, expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)

  const hasLicense = !!(activeLicenses && activeLicenses.length > 0)
  const latestLicense = activeLicenses?.[0] || null

  // Calculer les jours restants
  let daysRemaining = 0
  let expiresAt: string | null = null
  if (latestLicense?.expires_at) {
    expiresAt = latestLicense.expires_at
    daysRemaining = Math.max(0, Math.ceil(
      (new Date(latestLicense.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    ))
  }

  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        role: user.role,
      },
      hasActiveLicense: hasLicense,
      daysRemaining,
      expiresAt,
    },
  })
}

