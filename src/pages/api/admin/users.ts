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

  // Vérifier que c'est un admin
  const user = await getAuthenticatedUser(req)
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès refusé' })
  }

  const supabase = getServiceSupabase()

  try {
    // Récupérer tous les utilisateurs avec leurs licences
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, name, phone_number, role, created_at,
        licenses!licenses_user_id_fkey (id, plan_type, status, expires_at)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[ADMIN] Erreur fetch users:', error)
      return res.status(500).json({ success: false, error: `Erreur serveur: ${error.message}` })
    }

    // Stats
    const { count: totalGenerations } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })

    return res.status(200).json({
      success: true,
      data: {
        users,
        stats: {
          totalUsers: users?.length || 0,
          totalGenerations: totalGenerations || 0,
        },
      },
    })
  } catch (error) {
    console.error('[ADMIN] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

