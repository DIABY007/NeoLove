/**
 * API: Diagnostic WhatsApp - Affiche la réponse brute de WasenderAPI
 * POST /api/test/whatsapp/diagnostic
 * 
 * Teste l'envoi et affiche tous les détails de la réponse API
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const WASENDER_API_BASE_URL = 'https://www.wasenderapi.com'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  try {
    const { phoneNumber, message } = req.body

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants',
        message: 'phoneNumber et message sont requis',
      })
    }

    const apiKey = process.env.WASENDER_API_KEY

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'WASENDER_API_KEY non configurée',
      })
    }

    // Formatter le numéro en format E.164 (avec +)
    // WasenderAPI attend le format E.164 avec le + : "+1234567890"
    let formattedNumber = phoneNumber.replace(/[^\d+]/g, '') // Garder seulement les chiffres et le +
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = `+${formattedNumber}`
    }

    const endpoint = `${WASENDER_API_BASE_URL}/api/send-message`
    const requestBody = {
      to: formattedNumber,
      text: message,
    }

    console.log('[Diagnostic] Requête vers WasenderAPI:', {
      endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    })

    const startTime = Date.now()
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseTime = Date.now() - startTime
    const responseText = await response.text()
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    return res.status(200).json({
      success: response.ok,
      diagnostic: {
        request: {
          endpoint,
          method: 'POST',
          body: requestBody,
          phoneNumber: formattedNumber,
          messageLength: message.length,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData,
          rawBody: responseText,
          responseTime: `${responseTime}ms`,
        },
        analysis: {
          isSuccess: response.ok && response.status === 200,
          hasError: responseData.error || responseData.failed || !response.ok,
          errorMessage: responseData.error || responseData.message || null,
          successMessage: responseData.success || responseData.message || null,
          messageStatus: responseData.data?.status || responseData.status || null,
          recommendation: response.ok
            ? responseData.data?.status === 'in_progress'
              ? '⚠️ L\'API a retourné un statut 200 mais le message est "in_progress". Vérifiez que la session WhatsApp est connectée sur wasenderapi.com/dashboard'
              : '✅ L\'API a retourné un statut 200. Vérifiez si le message a été livré.'
            : '❌ L\'API a retourné une erreur. Vérifiez la clé API et la session WhatsApp',
        },
      },
    })
  } catch (error: any) {
    console.error('Erreur POST /api/test/whatsapp/diagnostic:', error)
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
}

