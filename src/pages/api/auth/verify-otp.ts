import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServiceSupabase } from '@/lib/supabase'
import { createSession } from '@/lib/auth'
import { PLANS } from '@/lib/constants'
import type { ApiResponse } from '@/lib/types'

const VerifyOtpSchema = z.object({
  phone_number: z.string()
    .min(8)
    .max(20)
    .regex(/^\+?[0-9]+$/),
  otp: z.string().length(6, 'Le code doit contenir 6 chiffres'),
  name: z.string().min(2).max(50).trim(),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  const validation = VerifyOtpSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.errors[0]?.message || 'Données invalides',
    })
  }

  const { phone_number, otp, name } = validation.data
  const supabase = getServiceSupabase()

  try {
    // Vérifier l'OTP
    const { data: otpRecord } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('code', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'Code invalide ou expiré',
      })
    }

    // Marquer l'OTP comme vérifié
    await supabase
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id)

    // Créer ou récupérer l'utilisateur
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phone_number)
      .single()

    if (!user) {
      // Nouvel utilisateur
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          name,
          phone_number,
          role: 'user',
        })
        .select()
        .single()

      if (createError || !newUser) {
        console.error('[VERIFY-OTP] Erreur création user:', createError)
        return res.status(500).json({ success: false, error: 'Erreur lors de la création du compte' })
      }

      user = newUser

      // Accorder automatiquement 3 jours d'essai gratuit
      const trialPlan = PLANS.find(p => p.id === 'trial')
      const trialDays = trialPlan?.durationDays || 3
      const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)

      await supabase.from('licenses').insert({
        code: `TRIAL-${newUser.id.slice(0, 8).toUpperCase()}`,
        plan_type: 'trial',
        status: 'active',
        user_id: newUser.id,
        expires_at: trialExpiresAt.toISOString(),
        created_by: newUser.id,
      })
    }

    // Créer la session (et révoquer les anciennes)
    await createSession(user.id, res)

    // Vérifier si l'utilisateur a une licence active
    const { data: activeLicenses } = await supabase
      .from('licenses')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    const hasActiveLicense = !!(activeLicenses && activeLicenses.length > 0)

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone_number: user.phone_number,
          role: user.role,
        },
        hasActiveLicense,
      },
    })
  } catch (error) {
    console.error('[VERIFY-OTP] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

