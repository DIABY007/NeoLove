import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServiceSupabase } from '@/lib/supabase'
import { sendOTP } from '@/lib/wasender'
import { APP_CONFIG } from '@/lib/constants'
import type { ApiResponse } from '@/lib/types'

const SendOtpSchema = z.object({
  phone_number: z.string()
    .min(8, 'Numéro trop court')
    .max(20, 'Numéro trop long')
    .regex(/^\+?[0-9]+$/, 'Numéro de téléphone invalide'),
  name: z.string()
    .min(2, 'Nom trop court')
    .max(50, 'Nom trop long')
    .trim(),
})

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  // Validation
  const validation = SendOtpSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.errors[0]?.message || 'Données invalides',
    })
  }

  const { phone_number, name } = validation.data
  const supabase = getServiceSupabase()

  try {
    // Générer l'OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + APP_CONFIG.otpExpiryMinutes * 60 * 1000)

    // Supprimer les anciens OTP non vérifiés pour ce numéro
    await supabase
      .from('otp_codes')
      .delete()
      .eq('phone_number', phone_number)
      .eq('verified', false)

    // Stocker l'OTP
    const { error: insertError } = await supabase.from('otp_codes').insert({
      phone_number,
      code: otp,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error('[SEND-OTP] Erreur insertion:', insertError)
      return res.status(500).json({ success: false, error: 'Erreur serveur' })
    }

    // Stocker le nom temporairement dans la table user si nécessaire
    // (sera créé/mis à jour lors de la vérification)

    // Envoyer l'OTP via WhatsApp
    const sent = await sendOTP(phone_number, otp)
    
    if (!sent) {
      console.error('[SEND-OTP] Échec envoi WhatsApp pour', phone_number)
      // En dev, on continue quand même (l'OTP est en BDD)
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ success: false, error: 'Impossible d\'envoyer le code. Vérifiez votre numéro.' })
      }
    }

    // Log en dev
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP pour ${phone_number}: ${otp}`)
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Code envoyé sur WhatsApp' },
    })
  } catch (error) {
    console.error('[SEND-OTP] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

