import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionTokenFromRequest, clearSessionCookie } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  const token = getSessionTokenFromRequest(req)

  if (token) {
    const supabase = getServiceSupabase()
    await supabase.from('sessions').delete().eq('session_token', token)
  }

  clearSessionCookie(res)

  return res.status(200).json({ success: true, data: { message: 'Déconnecté' } })
}

