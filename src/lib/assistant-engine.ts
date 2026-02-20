/**
 * Assistant Engine — Moteur d'analyse côté client
 * Analyse heuristique instantanée du message reçu pour :
 *   - Scoring d'intérêt (niveaux textuels, pas de %)
 *   - Recommandation d'objectif (3 suggestions)
 *   - Recommandation de ton (2-3 tons)
 *   - Checks runtime (sécurité, répétitions, engagement)
 */

import type { ObjectiveId, ToneId } from './constants'

// ════════════════════════════════════════
// TYPES
// ════════════════════════════════════════

export type InterestLevel = 'faible' | 'modéré' | 'élevé' | 'incertain'
export type EnergyLevel = 'faible' | 'neutre' | 'élevée'
export type ProbableIntent = 'curiosité' | 'politesse' | 'test' | 'proposition' | 'intérêt' | 'désengagement' | 'flirt' | 'neutre'
export type RiskLevel = 'aucun' | 'test' | 'distance' | 'désengagement'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface MessageAnalysis {
  interest_level: InterestLevel
  energy: EnergyLevel
  probable_intent: ProbableIntent
  risk: RiskLevel
}

export interface InterestScoring {
  level: InterestLevel
  confidence: ConfidenceLevel
  justification: string
}

export interface ObjectiveSuggestion {
  objectif_id: ObjectiveId
  raison: string
  when_to_use: string
}

export interface ToneSuggestion {
  id: ToneId
  label: string
  one_line_guidance: string
}

export interface RuntimeCheck {
  type: 'info' | 'warning' | 'block'
  message: string
  action?: string
}

export interface AssistantAnalysis {
  message_received: string
  analysis: MessageAnalysis
  scoring: InterestScoring
  suggestions: {
    objectives: ObjectiveSuggestion[]
    tones: ToneSuggestion[]
  }
  runtime_checks: RuntimeCheck[]
  timestamp: string
}

export interface HistoryEntry {
  id: string
  text: string
  tone: ToneId
  objective: ObjectiveId
  contact?: string
  timestamp: string
}

export interface Contact {
  name: string
  number: string
  lastUsed: string
}

// ════════════════════════════════════════
// ANALYSE DU MESSAGE
// ════════════════════════════════════════

const POSITIVE_MARKERS = [
  /\?.*\?/,                          // Double question = très engagé
  /\bhaha\b|\bmdr+\b|\blol\b/i,    // Rires
  /😂|😄|😊|🥰|❤️|💕|😍|🔥|💫|✨/,   // Emojis positifs
  /j'adore|j'aime|trop bien|génial|incroyable|magnifique/i,
  /raconte|dis[- ]moi|explique|t'en penses quoi/i, // Questions ouvertes
  /te voir|se voir|on se voit|rdv|rendez[- ]vous/i,
  /tu me plais|tu m'intéresses|envie/i,
]

const NEGATIVE_MARKERS = [
  /^(ok|oui|non|ouais|mouais|bof|bien|ah|mm?h?)\.?$/i, // Réponses ultra-courtes
  /^(salut|hey|coucou|hello)\.?$/i,                      // Openers sans effort
  /^(bien et toi|ça va|rien de spécial|pas grand chose)\.?$/i,
  /je sais pas|aucune idée|jsp/i,
  /pas trop|pas vraiment|peut[- ]être|on verra/i,
]

const QUESTION_MARKERS = /\?/
const OPEN_QUESTION_MARKERS = /(?:quoi|comment|pourquoi|quel|raconte|dis[- ]moi|explique|où|quand)/i

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

function hasEmojis(text: string): boolean {
  // Detect common emoji ranges without the 'u' flag for ES5 compat
  // eslint-disable-next-line no-control-regex
  return /[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/.test(text)
}

export function analyzeMessage(message: string): MessageAnalysis {
  const msg = message.trim()
  if (!msg) {
    return { interest_level: 'incertain', energy: 'faible', probable_intent: 'neutre', risk: 'désengagement' }
  }

  const wordCount = countWords(msg)
  const hasQuestion = QUESTION_MARKERS.test(msg)
  const hasOpenQuestion = OPEN_QUESTION_MARKERS.test(msg)
  const positiveCount = POSITIVE_MARKERS.filter(p => p.test(msg)).length
  const negativeCount = NEGATIVE_MARKERS.filter(p => p.test(msg)).length
  const hasPositiveEmoji = hasEmojis(msg)

  // === Interest level ===
  let interest: InterestLevel = 'modéré'
  let interestScore = 0

  if (wordCount <= 2) interestScore -= 2
  else if (wordCount <= 5) interestScore -= 1
  else if (wordCount >= 15) interestScore += 2
  else if (wordCount >= 8) interestScore += 1

  interestScore += positiveCount * 1.5
  interestScore -= negativeCount * 2
  if (hasQuestion) interestScore += 1
  if (hasOpenQuestion) interestScore += 1.5
  if (hasPositiveEmoji) interestScore += 0.5

  if (interestScore >= 3) interest = 'élevé'
  else if (interestScore >= 0.5) interest = 'modéré'
  else if (interestScore < -1) interest = 'faible'
  else interest = 'incertain'

  // === Energy ===
  let energy: EnergyLevel = 'neutre'
  if (wordCount <= 3 && !hasQuestion) energy = 'faible'
  else if (positiveCount >= 2 || wordCount >= 15 || /!/.test(msg)) energy = 'élevée'

  // === Probable intent ===
  let intent: ProbableIntent = 'neutre'
  if (/se voir|rdv|rendez|verre|café|week[- ]end|samedi|dimanche|dispo/i.test(msg)) intent = 'proposition'
  else if (/tu me plais|je t'aime|envie.*connaître|craqu/i.test(msg)) intent = 'flirt'
  else if (hasOpenQuestion) intent = 'curiosité'
  else if (/salut|hey|coucou|ça va|quoi de neuf/i.test(msg) && wordCount <= 5) intent = 'politesse'
  else if (/ok|ouais|ah|mouais|bof/i.test(msg) && wordCount <= 3) intent = 'désengagement'
  else if (/vraiment|sérieux|c'est vrai/i.test(msg)) intent = 'test'
  else if (positiveCount > 0) intent = 'intérêt'

  // === Risk ===
  let risk: RiskLevel = 'aucun'
  if (intent === 'désengagement') risk = 'désengagement'
  else if (intent === 'test') risk = 'test'
  else if (interest === 'faible') risk = 'distance'

  return { interest_level: interest, energy, probable_intent: intent, risk }
}

// ════════════════════════════════════════
// SCORING D'INTÉRÊT
// ════════════════════════════════════════

export function computeScoring(message: string, analysis: MessageAnalysis): InterestScoring {
  const wordCount = countWords(message.trim())
  const hasQuestion = QUESTION_MARKERS.test(message)

  // Confiance
  let confidence: ConfidenceLevel = 'medium'
  if (wordCount <= 3) confidence = 'low'
  else if (wordCount >= 10 && (hasQuestion || analysis.probable_intent !== 'neutre')) confidence = 'high'

  // Justification
  const parts: string[] = []
  if (wordCount <= 3) parts.push('Message très court')
  else if (wordCount >= 10) parts.push('Message développé')
  else parts.push('Message de longueur moyenne')

  if (hasQuestion) parts.push('contient une question')
  if (hasEmojis(message)) parts.push('emojis positifs')
  if (analysis.probable_intent === 'désengagement') parts.push('signes de désintérêt')
  if (analysis.probable_intent === 'flirt') parts.push('signaux de flirt')
  if (analysis.probable_intent === 'proposition') parts.push('propose une rencontre')

  const justification = `${parts.join(' + ')} → intérêt ${analysis.interest_level} (confiance ${confidence === 'low' ? 'faible' : confidence === 'medium' ? 'moyenne' : 'haute'})`

  return { level: analysis.interest_level, confidence, justification }
}

// ════════════════════════════════════════
// RECOMMANDATION D'OBJECTIF
// ════════════════════════════════════════

export function suggestObjectives(
  analysis: MessageAnalysis,
  history: HistoryEntry[] = []
): ObjectiveSuggestion[] {
  const suggestions: ObjectiveSuggestion[] = []
  const recentObjectives = history.slice(0, 5).map(h => h.objective)

  // Logique contextuelle basée sur l'analyse
  switch (analysis.probable_intent) {
    case 'politesse':
    case 'neutre':
      if (analysis.interest_level === 'faible') {
        suggestions.push({
          objectif_id: 'désamorcer_froid',
          raison: 'Message fade, rebondis avec humour pour relancer',
          when_to_use: 'Quand le message reçu manque d\'effort ou de contenu',
        })
        suggestions.push({
          objectif_id: 'attirer_attention',
          raison: 'Alternative : capte l\'attention avec une accroche originale',
          when_to_use: 'Si tu veux créer une dynamique positive dès maintenant',
        })
        suggestions.push({
          objectif_id: 'tester_intérêt',
          raison: 'Conservateur : teste si la personne s\'investit vraiment',
          when_to_use: 'Si tu hésites à investir du temps',
        })
      } else {
        suggestions.push({
          objectif_id: 'créer_complicité',
          raison: 'Échange neutre, crée du lien sur un sujet commun',
          when_to_use: 'Pour approfondir la conversation naturellement',
        })
        suggestions.push({
          objectif_id: 'attirer_attention',
          raison: 'Alternative : sors du cadre classique',
          when_to_use: 'Si tu veux marquer les esprits',
        })
      }
      break

    case 'curiosité':
      suggestions.push({
        objectif_id: 'créer_complicité',
        raison: 'La personne pose des questions → crée du lien',
        when_to_use: 'L\'interlocuteur montre de la curiosité active',
      })
      suggestions.push({
        objectif_id: 'créer_tension',
        raison: 'Si le feeling est bon, ajoute une touche de flirt',
        when_to_use: 'Si la dynamique est déjà positive depuis quelques messages',
      })
      break

    case 'intérêt':
      suggestions.push({
        objectif_id: 'créer_tension',
        raison: 'Signaux positifs détectés → passe au flirt subtil',
        when_to_use: 'L\'intérêt est manifeste, c\'est le moment',
      })
      suggestions.push({
        objectif_id: 'proposer_rdv',
        raison: 'Si vous échangez depuis un moment, propose un rdv',
        when_to_use: 'Si la complicité est bien installée',
      })
      break

    case 'flirt':
      suggestions.push({
        objectif_id: 'créer_tension',
        raison: 'Réponse flirteuse → maintiens la dynamique',
        when_to_use: 'L\'autre envoie des signaux de flirt clairs',
      })
      suggestions.push({
        objectif_id: 'proposer_rdv',
        raison: 'Le moment est peut-être venu de se voir en vrai',
        when_to_use: 'Si le flirt dure depuis plusieurs échanges',
      })
      break

    case 'proposition':
      suggestions.push({
        objectif_id: 'proposer_rdv',
        raison: 'L\'autre propose déjà une rencontre → confirme !',
        when_to_use: 'Message contenant une ouverture vers un rdv',
      })
      suggestions.push({
        objectif_id: 'créer_tension',
        raison: 'Alternative : fais monter l\'attente avant de confirmer',
        when_to_use: 'Si tu veux créer plus de tension avant le rdv',
      })
      break

    case 'désengagement':
      suggestions.push({
        objectif_id: 'désamorcer_froid',
        raison: 'Réponse faible → rebondis sans pression',
        when_to_use: 'Quand l\'autre semble se désengager',
      })
      suggestions.push({
        objectif_id: 'prendre_distance',
        raison: 'Si tu sens que ça ne mène nulle part',
        when_to_use: 'Après plusieurs tentatives sans engagement',
      })
      suggestions.push({
        objectif_id: 'tester_intérêt',
        raison: 'Dernière vérification avant de lâcher',
        when_to_use: 'Pour savoir si ça vaut le coup de continuer',
      })
      break

    case 'test':
      suggestions.push({
        objectif_id: 'tester_intérêt',
        raison: 'L\'autre te teste → montre ta confiance',
        when_to_use: 'Quand le message semble être un test',
      })
      suggestions.push({
        objectif_id: 'créer_complicité',
        raison: 'Réponds naturellement pour créer du lien',
        when_to_use: 'Si tu ne veux pas entrer dans le jeu du test',
      })
      break
  }

  // Éviter les répétitions d'objectifs récents
  if (suggestions.length > 0 && recentObjectives.length > 0) {
    const lastObj = recentObjectives[0]
    if (suggestions[0].objectif_id === lastObj && suggestions.length > 1) {
      // Mettre la suggestion non-répétée en premier
      const [first, ...rest] = suggestions
      const nonRepeat = rest.find(s => s.objectif_id !== lastObj)
      if (nonRepeat) {
        suggestions.splice(0, suggestions.length, nonRepeat, first, ...rest.filter(s => s !== nonRepeat))
      }
    }
  }

  return suggestions.slice(0, 3)
}

// ════════════════════════════════════════
// RECOMMANDATION DE TON
// ════════════════════════════════════════

export function suggestTones(
  analysis: MessageAnalysis,
  selectedObjective: ObjectiveId
): ToneSuggestion[] {
  const tones: ToneSuggestion[] = []

  // Logique basée sur objectif + analyse
  const objectiveToneMap: Record<ObjectiveId, ToneSuggestion[]> = {
    'attirer_attention': [
      { id: 'taquin', label: 'Taquin', one_line_guidance: 'Provoque légèrement pour marquer les esprits' },
      { id: 'joueur', label: 'Joueur', one_line_guidance: 'Propose un défi ou une question fun' },
    ],
    'relancer_sans_needy': [
      { id: 'joueur', label: 'Joueur', one_line_guidance: 'Relance avec humour, sans pression' },
      { id: 'taquin', label: 'Taquin', one_line_guidance: 'Petite pique amusante pour faire réagir' },
      { id: 'neutre', label: 'Neutre', one_line_guidance: 'Simple et naturel, sans forcer' },
    ],
    'créer_complicité': [
      { id: 'neutre', label: 'Neutre', one_line_guidance: 'Authentique et posé pour créer du lien' },
      { id: 'empathique', label: 'Empathique', one_line_guidance: 'Montre que tu écoutes et comprends' },
      { id: 'joueur', label: 'Joueur', one_line_guidance: 'Rends l\'échange dynamique et fun' },
    ],
    'créer_tension': [
      { id: 'taquin', label: 'Taquin', one_line_guidance: 'Flirt subtil avec une pointe de provocation' },
      { id: 'romantique', label: 'Romantique', one_line_guidance: 'Doux et attentionné pour créer l\'intimité' },
    ],
    'tester_intérêt': [
      { id: 'taquin', label: 'Taquin', one_line_guidance: 'Pose un petit défi pour voir la réaction' },
      { id: 'neutre', label: 'Neutre', one_line_guidance: 'Direct et clair, sans détour' },
    ],
    'proposer_rdv': [
      { id: 'joueur', label: 'Joueur', one_line_guidance: 'Proposition sous forme de défi fun' },
      { id: 'neutre', label: 'Neutre', one_line_guidance: 'Proposition directe, simple et claire' },
      { id: 'romantique', label: 'Romantique', one_line_guidance: 'Proposition douce et attentionnée' },
    ],
    'désamorcer_froid': [
      { id: 'taquin', label: 'Taquin', one_line_guidance: 'Ironie bienveillante pour réveiller l\'échange' },
      { id: 'joueur', label: 'Joueur', one_line_guidance: 'Reset ludique de la conversation' },
    ],
    'prendre_distance': [
      { id: 'sérieux', label: 'Sérieux', one_line_guidance: 'Honnête et respectueux pour clore' },
      { id: 'empathique', label: 'Empathique', one_line_guidance: 'Bienveillant même en se retirant' },
    ],
  }

  tones.push(...(objectiveToneMap[selectedObjective] || [
    { id: 'neutre', label: 'Neutre', one_line_guidance: 'Safe, équilibré et naturel' },
  ]))

  // Si le message a une énergie élevée, favoriser joueur/taquin
  if (analysis.energy === 'élevée' && !tones.find(t => t.id === 'joueur')) {
    tones.push({ id: 'joueur', label: 'Joueur', one_line_guidance: 'L\'énergie est haute, surfe dessus' })
  }

  return tones.slice(0, 3)
}

// ════════════════════════════════════════
// RUNTIME CHECKS
// ════════════════════════════════════════

export function runRuntimeChecks(
  analysis: MessageAnalysis,
  history: HistoryEntry[] = [],
  selectedObjective: ObjectiveId
): RuntimeCheck[] {
  const checks: RuntimeCheck[] = []

  // Check 1 : Désengagement + intérêt faible → suggest prendre_distance
  if (analysis.risk === 'désengagement' && analysis.interest_level === 'faible') {
    checks.push({
      type: 'warning',
      message: 'Signaux de désintérêt détectés. Envisage de prendre de la distance.',
      action: 'prendre_distance',
    })
  }

  // Check 2 : Trop de tentatives en 24h sans engagement
  const last24h = history.filter(h => {
    const diff = Date.now() - new Date(h.timestamp).getTime()
    return diff < 24 * 60 * 60 * 1000
  })
  if (last24h.length > 2 && analysis.interest_level === 'faible') {
    checks.push({
      type: 'warning',
      message: `${last24h.length} messages envoyés en 24h sans engagement réciproque. Laisse respirer.`,
      action: 'prendre_distance',
    })
  }

  // Check 3 : Répétitions de templates similaires
  const recentObjectives = history.slice(0, 3).map(h => h.objective)
  const sameObjCount = recentObjectives.filter(o => o === selectedObjective).length
  if (sameObjCount >= 2) {
    checks.push({
      type: 'info',
      message: 'Tu as utilisé cet objectif récemment. Varie ton approche pour éviter la monotonie.',
    })
  }

  // Check 4 : Proposer rdv quand signal pas ouvert
  if (selectedObjective === 'proposer_rdv' && analysis.interest_level !== 'élevé') {
    checks.push({
      type: 'info',
      message: 'L\'intérêt n\'est pas encore clair. Considère tester l\'intérêt avant de proposer un rdv.',
      action: 'tester_intérêt',
    })
  }

  return checks
}

// ════════════════════════════════════════
// ANALYSE COMPLÈTE
// ════════════════════════════════════════

export function runFullAnalysis(
  message: string,
  history: HistoryEntry[] = [],
  selectedObjective?: ObjectiveId
): AssistantAnalysis {
  const analysis = analyzeMessage(message)
  const scoring = computeScoring(message, analysis)
  const objectives = suggestObjectives(analysis, history)
  const effectiveObjective = selectedObjective || objectives[0]?.objectif_id || 'créer_complicité'
  const tones = suggestTones(analysis, effectiveObjective)
  const checks = runRuntimeChecks(analysis, history, effectiveObjective)

  return {
    message_received: message,
    analysis,
    scoring,
    suggestions: { objectives, tones },
    runtime_checks: checks,
    timestamp: new Date().toISOString(),
  }
}

// ════════════════════════════════════════
// STORAGE HELPERS (localStorage)
// ════════════════════════════════════════

const HISTORY_KEY = 'neolove_history'
const CONTACTS_KEY = 'neolove_contacts'
const MAX_HISTORY = 50
const MAX_CONTACTS = 20

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return
  const history = getHistory()
  const newEntry: HistoryEntry = {
    ...entry,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  }
  history.unshift(newEntry)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

export function getContacts(): Contact[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CONTACTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveContact(contact: Contact): void {
  if (typeof window === 'undefined') return
  const contacts = getContacts()
  // Deduplicate par numéro
  const filtered = contacts.filter(c => c.number !== contact.number)
  filtered.unshift({ ...contact, lastUsed: new Date().toISOString() })
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(filtered.slice(0, MAX_CONTACTS)))
}

export function buildWhatsAppUrl(number: string, message: string): string {
  const cleaned = number.replace(/[^+\d]/g, '')
  const num = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

// ════════════════════════════════════════
// ANALYTICS LOG
// ════════════════════════════════════════

const LOG_KEY = 'neolove_analytics'

export interface AnalyticsEvent {
  user_id: string
  session_id: string
  message_id: string
  selected_objective: string
  selected_tone: string
  contact_selected: boolean
  action: 'copy' | 'send' | 'generate'
  timestamp: string
}

export function logAnalyticsEvent(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(LOG_KEY)
    const logs: AnalyticsEvent[] = raw ? JSON.parse(raw) : []
    logs.push(event)
    // Garder 30 jours
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const filtered = logs.filter(l => new Date(l.timestamp).getTime() > cutoff)
    localStorage.setItem(LOG_KEY, JSON.stringify(filtered))
  } catch {
    // Silent fail
  }
}

