/**
 * Correcteur grammatical et orthographique pour les réponses générées
 * Corrige les fautes courantes identifiées dans les tests
 */

/**
 * Règles de correction grammaticale
 */
const GRAMMAR_RULES: Array<{
  pattern: RegExp
  replacement: string | ((match: string, ...args: any[]) => string)
  description: string
}> = [
  // "Travaille" au début de phrase → "Je travaille"
  {
    pattern: /^Travaille\s/,
    replacement: 'Je travaille ',
    description: 'Correction du verbe au début de phrase',
  },
  // "Tu as fais" → "Tu as fait"
  {
    pattern: /\bTu as fais\b/gi,
    replacement: 'Tu as fait',
    description: 'Correction de la conjugaison du passé composé',
  },
  // "te ferais rires" → "te feraient rire"
  {
    pattern: /\bte ferais rires\b/gi,
    replacement: 'te feraient rire',
    description: 'Correction de la conjugaison conditionnelle',
  },
  // "tu fais parti" → "tu fais partie"
  {
    pattern: /\btu fais parti\b/gi,
    replacement: 'tu fais partie',
    description: 'Correction de "parti" → "partie"',
  },
  // "tu fais parti" → "tu fais partie" (variante avec majuscule)
  {
    pattern: /\bTu fais parti\b/g,
    replacement: 'Tu fais partie',
    description: 'Correction de "parti" → "partie" (majuscule)',
  },
  // "parler moi" → "me parler" (général)
  {
    pattern: /\bparler moi\b/gi,
    replacement: 'me parler',
    description: 'Correction de "parler moi" → "me parler"',
  },
  // Espaces avant ponctuation
  {
    pattern: /\s+([.,!?;:])/g,
    replacement: '$1',
    description: 'Suppression des espaces avant ponctuation',
  },
  // Double espaces
  {
    pattern: /\s{2,}/g,
    replacement: ' ',
    description: 'Suppression des espaces multiples',
  },
  // Espace après ponctuation (sauf fin de phrase)
  {
    pattern: /([.,!?;:])([A-Za-z])/g,
    replacement: '$1 $2',
    description: 'Ajout d\'espace après ponctuation',
  },
]

/**
 * Corrections spécifiques pour des phrases complètes
 */
const PHRASE_CORRECTIONS: Array<{
  pattern: RegExp
  replacement: string
}> = [
  // "Avant de parler moi de toi" → "Avant de me parler de toi"
  {
    pattern: /\bAvant de parler moi de toi\b/gi,
    replacement: 'Avant de me parler de toi',
  },
  // "parler moi de toi" → "me parler de toi"
  {
    pattern: /\bparler moi de toi\b/gi,
    replacement: 'me parler de toi',
  },
]

/**
 * Corriger une phrase selon les règles définies
 */
function correctPhrase(phrase: string): string {
  let corrected = phrase.trim()

  // Appliquer les corrections de phrases complètes d'abord
  for (const rule of PHRASE_CORRECTIONS) {
    corrected = corrected.replace(rule.pattern, rule.replacement)
  }

  // Appliquer les règles grammaticales
  for (const rule of GRAMMAR_RULES) {
    if (typeof rule.replacement === 'function') {
      corrected = corrected.replace(rule.pattern, rule.replacement as any)
    } else {
      corrected = corrected.replace(rule.pattern, rule.replacement)
    }
  }

  // Nettoyer les espaces en début/fin
  corrected = corrected.trim()

  // Capitaliser la première lettre si nécessaire
  if (corrected.length > 0 && !/[A-ZÉÈÊÀ]/.test(corrected[0])) {
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1)
  }

  return corrected
}

/**
 * Corriger un tableau de réponses générées
 */
export function correctGeneratedResponses(responses: string[]): string[] {
  return responses.map(response => {
    // Ne pas corriger si la réponse est trop courte ou vide
    if (!response || response.trim().length < 3) {
      return response
    }

    try {
      return correctPhrase(response)
    } catch (error) {
      // En cas d'erreur, retourner la réponse originale
      console.warn('[GrammarCorrector] Erreur lors de la correction:', error)
      return response
    }
  })
}

/**
 * Vérifier et corriger une réponse unique
 */
export function correctResponse(response: string): string {
  if (!response || response.trim().length < 3) {
    return response
  }

  try {
    return correctPhrase(response)
  } catch (error) {
    console.warn('[GrammarCorrector] Erreur lors de la correction:', error)
    return response
  }
}

