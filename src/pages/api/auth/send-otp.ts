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
  // Désactiver le cache pour cette route
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

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

    // Envoyer l'OTP via WhatsApp (en arrière-plan, sans bloquer)
    let whatsappSent = false
    try {
      whatsappSent = await sendOTP(phone_number, otp)
    } catch (err) {
      console.error('[SEND-OTP] Erreur WhatsApp:', err)
    }

    console.log(`[SEND-OTP] OTP pour ${phone_number}: ${otp} | WhatsApp envoyé: ${whatsappSent}`)

    // Retourner le code seulement si WhatsApp n'a pas fonctionné (fallback)
    // Si WhatsApp fonctionne, ne pas exposer le code pour plus de sécurité
    return res.status(200).json({
      success: true,
      data: {
        message: whatsappSent
          ? 'Code envoyé ! Vérifiez votre WhatsApp.'
          : 'WhatsApp indisponible. Utilisez le code affiché ci-dessous.',
        whatsapp_sent: whatsappSent,
        // Ne retourner le code que si WhatsApp n'a pas fonctionné
        ...(whatsappSent ? {} : { otp_code: otp }),
      },
    })
  } catch (error) {
    console.error('[SEND-OTP] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}
