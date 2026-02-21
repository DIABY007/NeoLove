import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getAuthenticatedUser, hasActiveLicense } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { callOpenRouter } from '@/lib/openrouter'
import { TONES, APP_CONFIG } from '@/lib/constants'
import { buildSystemPrompt, buildUserMessage, parseGeneratedResponses } from '@/utils/prompts'
import { getRelevantTemplates } from '@/utils/rag'
import type { ApiResponse, GenerateResponse } from '@/lib/types'
import type { ToneId } from '@/lib/constants'

const GenerateSchema = z.object({
  receivedMessage: z.string()
    .min(1, 'Le message reçu ne peut pas être vide')
    .max(APP_CONFIG.maxInputLength, `Maximum ${APP_CONFIG.maxInputLength} caractères`),
  lastUserMessage: z.string()
    .max(APP_CONFIG.maxInputLength, `Maximum ${APP_CONFIG.maxInputLength} caractères`)
    .optional(),
  additionalContext: z.string()
    .max(APP_CONFIG.maxContextLength, `Maximum ${APP_CONFIG.maxContextLength} caractères`)
    .optional()
    .default(''),
  tone: z.enum(['neutre', 'taquin', 'sérieux', 'romantique', 'joueur', 'empathique'] as const),
  objective: z.string().optional().default(''),
})

// Rate limiting simple en mémoire (à remplacer par Redis en production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (entry.count >= APP_CONFIG.rateLimitPerMinute) {
    return false
  }

  entry.count++
  return true
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GenerateResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  // 1. Authentification
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non authentifié' })
  }

  // 2. Vérification licence
  const licensed = await hasActiveLicense(user.id)
  if (!licensed) {
    return res.status(403).json({
      success: false,
      error: 'Licence inactive ou expirée. Activez un code depuis votre profil.',
    })
  }

  // 3. Rate limiting
  if (!checkRateLimit(user.id)) {
    return res.status(429).json({
      success: false,
      error: 'Trop de requêtes. Attendez 1 minute avant de réessayer.',
    })
  }

  // 4. Validation du payload
  const validation = GenerateSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.errors[0]?.message || 'Données invalides',
    })
  }

  const { receivedMessage, lastUserMessage, additionalContext, tone, objective } = validation.data

  try {
    // 5. RAG léger : récupérer des templates pertinents
    const ragContext = getRelevantTemplates(receivedMessage, tone as ToneId)

    // 6. Construire les prompts (avec objectif si fourni)
    const systemPrompt = buildSystemPrompt(tone as ToneId, ragContext, objective || undefined)
    const userMessage = buildUserMessage(receivedMessage, lastUserMessage, additionalContext)

    // 7. Appel LLM via OpenRouter
    const rawResponse = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ])

    // 8. Parser les réponses
    const outputs = parseGeneratedResponses(rawResponse)

    // 9. Sauvegarder la génération en BDD
    const supabase = getServiceSupabase()
    const { data: generation, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        input_message: receivedMessage,
        tone,
        context: additionalContext || null,
        outputs: JSON.stringify(outputs),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[GENERATE] Erreur sauvegarde:', insertError)
    }

    return res.status(200).json({
      success: true,
      data: {
        outputs,
        generation_id: generation?.id || '',
      },
    })
  } catch (error) {
    console.error('[GENERATE] Erreur:', error)
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération. Réessayez dans quelques instants.',
    })
  }
}

