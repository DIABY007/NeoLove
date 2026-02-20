import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { PLANS } from '@/lib/constants'
import type { ApiResponse } from '@/lib/types'

const ActivateSchema = z.object({
  code: z.string()
    .min(4, 'Code trop court')
    .max(30, 'Code trop long')
    .trim()
    .toUpperCase(),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  // Authentification
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non authentifié' })
  }

  // Validation
  const validation = ActivateSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.errors[0]?.message || 'Code invalide',
    })
  }

  const { code } = validation.data
  const supabase = getServiceSupabase()

  try {
    // Vérifier que le code existe et est "unused"
    const { data: license, error: fetchError } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', code)
      .eq('status', 'unused')
      .single()

    if (fetchError || !license) {
      return res.status(400).json({
        success: false,
        error: 'Code invalide ou déjà utilisé',
      })
    }

    // Calculer la durée du nouveau plan
    const plan = PLANS.find(p => p.id === license.plan_type)
    const durationDays = plan?.durationDays || 3
    const durationMs = durationDays * 24 * 60 * 60 * 1000

    // Vérifier si l'utilisateur a déjà une licence active (pour accumulation)
    const { data: existingLicenses } = await supabase
      .from('licenses')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)

    // Accumulation : partir de la fin de la licence existante ou de maintenant
    let startFrom = Date.now()
    if (existingLicenses && existingLicenses.length > 0) {
      const existingExpiry = new Date(existingLicenses[0].expires_at).getTime()
      if (existingExpiry > startFrom) {
        startFrom = existingExpiry
      }
    }

    const expiresAt = new Date(startFrom + durationMs)

    // Activer la licence
    const { error: updateError } = await supabase
      .from('licenses')
      .update({
        status: 'active',
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', license.id)

    if (updateError) {
      console.error('[ACTIVATE] Erreur mise à jour:', updateError)
      return res.status(500).json({ success: false, error: 'Erreur lors de l\'activation' })
    }

    // Calculer le nombre total de jours restants pour le message
    const totalDaysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))

    return res.status(200).json({
      success: true,
      data: {
        message: `Licence ${plan?.name || license.plan_type} activée ! Vous avez ${totalDaysRemaining} jours au total.`,
        plan_type: license.plan_type,
        expires_at: expiresAt.toISOString(),
        days_remaining: totalDaysRemaining,
      },
    })
  } catch (error) {
    console.error('[ACTIVATE] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

