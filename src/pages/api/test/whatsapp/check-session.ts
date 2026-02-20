/**
 * API: Vérifier le statut de la session WhatsApp
 * GET /api/test/whatsapp/check-session
 * 
 * Vérifie si la session WhatsApp est connectée sur WasenderAPI
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const WASENDER_API_BASE_URL = 'https://www.wasenderapi.com'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  try {
    const apiKey = process.env.WASENDER_API_KEY

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'WASENDER_API_KEY non configurée',
      })
    }

    // Endpoint pour vérifier le statut de la session
    // Note: L'endpoint exact peut varier selon la documentation WasenderAPI
    const endpoints = [
      '/api/session/status',
      '/api/status',
      '/api/check-session',
      '/api/connection-status',
    ]

    let lastError = null
    let workingEndpoint = null
    let sessionData = null

    // Essayer différents endpoints
    for (const endpoint of endpoints) {
      try {
        const url = `${WASENDER_API_BASE_URL}${endpoint}`
        console.log('[Check Session] Tentative avec:', url)

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          workingEndpoint = endpoint
          sessionData = data
          break
        }
      } catch (error: any) {
        lastError = error.message
        continue
      }
    }

    // Si aucun endpoint ne fonctionne, tester avec un envoi de test
    if (!sessionData) {
      // Tester avec un envoi de message pour voir le statut
      const testResponse = await fetch(`${WASENDER_API_BASE_URL}/api/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: '+0000000000', // Numéro de test invalide pour voir l'erreur
          text: 'test',
        }),
      })

      const testData = await testResponse.json()

      return res.status(200).json({
        success: true,
        diagnostic: {
          method: 'test_send',
          note: 'Aucun endpoint de statut trouvé, test avec envoi',
          testResponse: {
            status: testResponse.status,
            data: testData,
          },
          recommendation: testResponse.status === 200
            ? '✅ La session semble fonctionner. Vérifiez le dashboard WasenderAPI pour le statut exact.'
            : '⚠️ Vérifiez la session sur wasenderapi.com/dashboard. Le statut "in_progress" indique que la session peut être déconnectée.',
        },
      })
    }

    return res.status(200).json({
      success: true,
      diagnostic: {
        endpoint: workingEndpoint,
        sessionData,
        recommendation: sessionData?.connected || sessionData?.status === 'connected'
          ? '✅ Session connectée'
          : '⚠️ Session déconnectée. Reconnectez sur wasenderapi.com/dashboard',
      },
    })
  } catch (error: any) {
    console.error('Erreur GET /api/test/whatsapp/check-session:', error)
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message,
    })
  }
}

