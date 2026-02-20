import fs from 'fs'
import path from 'path'
import type { ToneId } from '@/lib/constants'

interface KBTemplate {
  template_id: string
  text: string
  ton: string
  objectif: string
  example_context: string
}

let templatesCache: KBTemplate[] | null = null

/**
 * Charger les templates de la base de connaissances
 */
function loadTemplates(): KBTemplate[] {
  if (templatesCache) return templatesCache

  try {
    const csvPath = path.join(process.cwd(), 'data', 'kb_templates.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').slice(1) // Skip header

    templatesCache = lines
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(';')
        return {
          template_id: parts[0] || '',
          text: parts[1] || '',
          ton: parts[2] || '',
          objectif: parts[3] || '',
          example_context: parts[4] || '',
        }
      })
      .filter(t => t.text.length > 10) // Filtrer les templates trop courts

    return templatesCache
  } catch (error) {
    console.warn('[RAG] Impossible de charger les templates:', error)
    return []
  }
}

/**
 * Mapper les tons de la KB vers les tons de l'app (ils sont les mêmes ici)
 */
function matchTone(kbTone: string, requestedTone: ToneId): boolean {
  // Correspondance directe
  if (kbTone === requestedTone) return true
  
  // Correspondances proches
  const toneMap: Record<string, string[]> = {
    'neutre': ['neutre', 'sérieux'],
    'taquin': ['taquin', 'joueur'],
    'sérieux': ['sérieux', 'neutre', 'empathique'],
    'romantique': ['romantique', 'empathique'],
    'joueur': ['joueur', 'taquin'],
    'empathique': ['empathique', 'sérieux', 'romantique'],
  }

  return (toneMap[requestedTone] || []).includes(kbTone)
}

/**
 * Rechercher les templates les plus pertinents pour un message et un ton donnés
 * (RAG léger basé sur des mots-clés et le ton)
 */
export function getRelevantTemplates(
  inputMessage: string,
  tone: ToneId,
  maxResults: number = 5
): string {
  const templates = loadTemplates()
  if (templates.length === 0) return ''

  const inputLower = inputMessage.toLowerCase()
  const inputWords = inputLower.split(/\s+/).filter(w => w.length > 3)

  // Scorer chaque template
  const scored = templates.map(template => {
    let score = 0
    const textLower = template.text.toLowerCase()

    // Bonus pour le ton correspondant
    if (matchTone(template.ton, tone)) score += 3
    
    // Bonus pour le ton exact
    if (template.ton === tone) score += 2

    // Bonus pour les mots-clés communs
    for (const word of inputWords) {
      if (textLower.includes(word)) score += 1
    }

    // Bonus pour les templates qui ne sont pas des variantes
    if (!template.template_id.includes('_var_')) score += 1

    // Malus pour les templates trop courts ou incomplets
    if (template.text.length < 20) score -= 2
    if (template.text.startsWith('●')) score -= 1

    return { template, score }
  })

  // Trier par score et prendre les meilleurs
  const best = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .filter(s => s.score > 0)

  if (best.length === 0) return ''

  // Formater en contexte RAG
  return best
    .map(s => `- "${s.template.text}" (ton: ${s.template.ton}, objectif: ${s.template.objectif})`)
    .join('\n')
}

