/**
 * Client OpenRouter pour la génération LLM
 * Modèle : mistralai/mistral-small-24b-instruct-2501
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'mistralai/mistral-small-24b-instruct-2501'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

/**
 * Appeler l'API OpenRouter pour générer du texte
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  temperature: number = 0.8,
  maxTokens: number = 1000
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://neolove.app',
      'X-Title': 'NeoLove',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[OPENROUTER] Erreur:', error)
    throw new Error(`Erreur OpenRouter: ${response.status}`)
  }

  const data: OpenRouterResponse = await response.json()
  return data.choices[0]?.message?.content || ''
}

