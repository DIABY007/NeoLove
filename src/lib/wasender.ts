/**
 * Client Wasender API pour l'envoi de messages WhatsApp
 * Documentation : https://wasenderapi.com/api-docs/messages/send-text-message
 */

const WASENDER_API_URL = process.env.WASENDER_API_URL || 'https://www.wasenderapi.com/api'
const WASENDER_API_KEY = process.env.WASENDER_API_KEY!

interface WasenderResponse {
  success: boolean
  data?: {
    msgId: number
    jid: string
    status: string
  }
  error?: string
}

/**
 * Envoyer un message texte via WhatsApp
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<WasenderResponse> {
  // Formatter le numéro en format E.164 (avec +)
  // S'assurer que le numéro commence par +
  const formattedNumber = to.startsWith('+') ? to : `+${to}`

  try {
    const response = await fetch(`${WASENDER_API_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WASENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedNumber,
        text: text,
      }),
    })

    const data = await response.json()

    // Log complet pour debug
    console.log(`[WASENDER] Réponse pour ${formattedNumber}: HTTP ${response.status}`, JSON.stringify(data))

    if (!response.ok) {
      console.error('[WASENDER] Erreur HTTP:', response.status, data)
      return { success: false, error: data.message || `Erreur WhatsApp (HTTP ${response.status})` }
    }

    // Vérifier si le message a été réellement accepté
    if (data.success === false) {
      console.error('[WASENDER] Erreur API:', data)
      return { success: false, error: data.message || data.error || 'Message non accepté par WhatsApp' }
    }

    return { success: true, data: data.data }
  } catch (error) {
    console.error('[WASENDER] Erreur réseau:', error)
    return { success: false, error: 'Erreur de connexion au service WhatsApp' }
  }
}

/**
 * Envoyer un OTP via WhatsApp
 */
export async function sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
  const message = `🔐 *NeoLove* — Votre code de vérification\n\n` +
    `Votre code : *${otp}*\n\n` +
    `Ce code expire dans 5 minutes.\n` +
    `Ne partagez jamais ce code avec quelqu'un d'autre.`

  const result = await sendWhatsAppMessage(phoneNumber, message)
  
  if (!result.success) {
    console.error(`[WASENDER] OTP non envoyé pour ${phoneNumber}: ${result.error}`)
  }
  
  return result.success
}
