/**
 * AssistantPanel — Panneau unique compact et collapsible
 * Intègre : Analyse | Objectif | Ton | Scoring | Historique | Contact/Envoi
 *
 * UX : pas 6 boutons → 1 panneau avec micro-interactions progressives
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Activity,
  Target,
  Palette,
  Clock,
  Send,
  Clipboard,
  Check,
  AlertTriangle,
  Info,
  Shield,
  User,
  Phone,
  X,
  RotateCcw,
  Zap,
  RefreshCw,
  Users,
  Flame,
  Search,
  Calendar,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { OBJECTIVES, TONES } from '@/lib/constants'
import type { ObjectiveId, ToneId } from '@/lib/constants'
import {
  runFullAnalysis,
  getHistory,
  addToHistory,
  getContacts,
  saveContact,
  buildWhatsAppUrl,
  logAnalyticsEvent,
  type AssistantAnalysis,
  type HistoryEntry,
  type Contact,
  type InterestLevel,
  type EnergyLevel,
  type RiskLevel,
  type RuntimeCheck,
} from '@/lib/assistant-engine'

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface AssistantPanelProps {
  inputMessage: string
  outputs: string[]
  selectedTone: ToneId
  onToneChange: (tone: ToneId) => void
  onObjectiveChange: (objective: ObjectiveId) => void
  selectedObjective: ObjectiveId
  userId: string
}

export interface UIPayload {
  message_received: string
  analysis: AssistantAnalysis['analysis'] | null
  suggested_objective: ObjectiveId | null
  suggested_tone: ToneId | null
  selected_objective: ObjectiveId
  selected_tone: ToneId
  contact_selected: Contact | null
  action: 'copy' | 'send' | null
  timestamp: string
}

// ═══════════════════════════════════════
// ICONS MAP
// ═══════════════════════════════════════

const OBJ_ICONS: Record<string, LucideIcon> = {
  Zap, RefreshCw, Users, Flame, Search, Calendar, Shield, LogOut,
}

// ═══════════════════════════════════════
// COULEURS UTILITAIRES
// ═══════════════════════════════════════

function interestColor(level: InterestLevel): string {
  switch (level) {
    case 'élevé': return 'text-green-400 bg-green-400/10'
    case 'modéré': return 'text-amber-400 bg-amber-400/10'
    case 'faible': return 'text-red-400 bg-red-400/10'
    default: return 'text-dark-400 bg-dark-700'
  }
}

function energyColor(level: EnergyLevel): string {
  switch (level) {
    case 'élevée': return 'text-green-400 bg-green-400/10'
    case 'neutre': return 'text-dark-300 bg-dark-700'
    case 'faible': return 'text-red-400 bg-red-400/10'
  }
}

function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'aucun': return 'text-green-400 bg-green-400/10'
    case 'test': return 'text-amber-400 bg-amber-400/10'
    case 'distance': return 'text-orange-400 bg-orange-400/10'
    case 'désengagement': return 'text-red-400 bg-red-400/10'
  }
}

function interestBar(level: InterestLevel): number {
  switch (level) {
    case 'élevé': return 3
    case 'modéré': return 2
    case 'faible': return 1
    default: return 0
  }
}

// ═══════════════════════════════════════
// SUB: AnalysisSummaryCard
// ═══════════════════════════════════════

function AnalysisSummaryCard({ analysis }: { analysis: AssistantAnalysis | null }) {
  if (!analysis) return null

  const { interest_level, energy, probable_intent, risk } = analysis.analysis
  const items = [
    { label: 'Intérêt', value: interest_level, colorFn: interestColor },
    { label: 'Énergie', value: energy, colorFn: energyColor },
    { label: 'Intent', value: probable_intent, colorFn: () => 'text-primary-400 bg-primary-400/10' },
    { label: 'Risque', value: risk, colorFn: riskColor },
  ]

  return (
    <div className="space-y-2">
      {/* Badges en ligne */}
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium assistant-badge-enter ${item.colorFn(item.value as never)}`}
          >
            <span className="opacity-60">{item.label}:</span>
            <span className="capitalize">{item.value}</span>
          </span>
        ))}
      </div>

      {/* Barre d'intérêt 3 segments */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-dark-500 w-12">Intérêt</span>
        <div className="flex gap-0.5 flex-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= interestBar(interest_level)
                  ? interest_level === 'élevé' ? 'bg-green-400'
                    : interest_level === 'modéré' ? 'bg-amber-400'
                    : 'bg-red-400'
                  : 'bg-dark-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Justification */}
      <p className="text-[10px] text-dark-500 leading-tight">
        {analysis.scoring.justification}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════
// SUB: ObjectiveChipGroup
// ═══════════════════════════════════════

function ObjectiveChipGroup({
  suggestions,
  selected,
  onSelect,
}: {
  suggestions: AssistantAnalysis['suggestions']['objectives']
  selected: ObjectiveId
  onSelect: (id: ObjectiveId) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => {
          const obj = OBJECTIVES.find(o => o.id === s.objectif_id)
          const Icon = obj ? OBJ_ICONS[obj.icon] : Target
          const isSelected = selected === s.objectif_id

          return (
            <button
              key={s.objectif_id}
              type="button"
              onClick={() => onSelect(s.objectif_id)}
              className={`group relative inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40 shadow-sm shadow-primary-500/10'
                  : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-500'
              }`}
              title={`${s.raison} — ${s.when_to_use}`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              <span>{obj?.label || s.objectif_id}</span>
              {i === 0 && !isSelected && (
                <span className="text-[8px] text-primary-500 ml-0.5">rec.</span>
              )}
              {/* Tooltip on hover */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-dark-800 border border-dark-600 text-[10px] text-dark-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                {s.raison}
              </span>
            </button>
          )
        })}
      </div>
      {/* All objectives in compact dropdown */}
      <details className="group">
        <summary className="text-[10px] text-dark-500 cursor-pointer hover:text-dark-300 transition-colors flex items-center gap-1">
          <ChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
          Tous les objectifs
        </summary>
        <div className="flex flex-wrap gap-1 mt-1">
          {OBJECTIVES.map(obj => {
            const Icon = OBJ_ICONS[obj.icon] || Target
            const isSelected = selected === obj.id
            return (
              <button
                key={obj.id}
                type="button"
                onClick={() => onSelect(obj.id)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all ${
                  isSelected
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                    : 'bg-dark-800/50 text-dark-400 border border-dark-700/50 hover:text-dark-200'
                }`}
                title={obj.description}
              >
                <Icon className="w-2.5 h-2.5" />
                {obj.label}
              </button>
            )
          })}
        </div>
      </details>
    </div>
  )
}

// ═══════════════════════════════════════
// SUB: ToneChipGroup
// ═══════════════════════════════════════

function ToneChipGroup({
  suggestions,
  selected,
  onSelect,
}: {
  suggestions: AssistantAnalysis['suggestions']['tones']
  selected: ToneId
  onSelect: (id: ToneId) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((s, i) => {
        const isSelected = selected === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`group relative inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all ${
              isSelected
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800/50 text-dark-400 border border-dark-700/50 hover:text-dark-200'
            }`}
            title={s.one_line_guidance}
          >
            <Palette className="w-2.5 h-2.5" />
            {s.label}
            {i === 0 && !isSelected && (
              <span className="text-[7px] text-primary-500/60">rec.</span>
            )}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-dark-800 border border-dark-600 text-[10px] text-dark-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
              {s.one_line_guidance}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════
// SUB: HistoryMini
// ═══════════════════════════════════════

function HistoryMini({
  history,
  onReuse,
}: {
  history: HistoryEntry[]
  onReuse: (text: string) => void
}) {
  const recent = history.slice(0, 3)
  if (recent.length === 0) return null

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'à l\'instant'
    if (mins < 60) return `il y a ${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `il y a ${hours}h`
    return `il y a ${Math.floor(hours / 24)}j`
  }

  return (
    <div className="space-y-1">
      {recent.map(h => (
        <div
          key={h.id}
          className="flex items-center gap-2 py-1 px-2 rounded-lg bg-dark-800/30 border border-dark-700/30 group"
        >
          <Clock className="w-2.5 h-2.5 text-dark-500 shrink-0" />
          <span className="text-[10px] text-dark-400 truncate flex-1" title={h.text}>
            {h.text.slice(0, 50)}{h.text.length > 50 ? '…' : ''}
          </span>
          <span className="text-[8px] text-dark-600 shrink-0">{timeAgo(h.timestamp)}</span>
          <button
            type="button"
            onClick={() => onReuse(h.text)}
            className="text-[8px] text-primary-500/60 hover:text-primary-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Réutiliser"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════
// SUB: ContactSelector
// ═══════════════════════════════════════

function ContactSelector({
  contact,
  onContactChange,
  onSend,
  onCopy,
  sendEnabled,
  copyEnabled,
  copiedIdx,
  outputText,
}: {
  contact: Contact | null
  onContactChange: (c: Contact | null) => void
  onSend: () => void
  onCopy: () => void
  sendEnabled: boolean
  copyEnabled: boolean
  copiedIdx: boolean
  outputText: string
}) {
  const [inputNumber, setInputNumber] = useState('')
  const [inputName, setInputName] = useState('')
  const [showRecent, setShowRecent] = useState(false)
  const [showSaveOpt, setShowSaveOpt] = useState(false)
  const [savedContacts, setSavedContacts] = useState<Contact[]>([])

  useEffect(() => {
    setSavedContacts(getContacts())
  }, [])

  const handleNumberSet = () => {
    if (!inputNumber.trim()) return
    const newContact: Contact = {
      name: inputName.trim() || inputNumber.trim(),
      number: inputNumber.trim(),
      lastUsed: new Date().toISOString(),
    }
    onContactChange(newContact)
    setShowSaveOpt(true)
  }

  const handleSaveContact = () => {
    if (contact) {
      saveContact(contact)
      setSavedContacts(getContacts())
      setShowSaveOpt(false)
    }
  }

  const handleSelectRecent = (c: Contact) => {
    onContactChange(c)
    setInputNumber(c.number)
    setInputName(c.name)
    setShowRecent(false)
  }

  return (
    <div className="space-y-2">
      {/* Input number */}
      <div className="flex gap-1.5">
        <div className="flex-1 flex gap-1">
          <input
            type="text"
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            placeholder="Nom"
            className="w-16 px-2 py-1 bg-dark-800 border border-dark-700 rounded-lg text-[10px] text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50"
          />
          <div className="flex-1 flex">
            <input
              type="tel"
              value={inputNumber}
              onChange={e => setInputNumber(e.target.value)}
              placeholder="+226 XX XX XX XX"
              className="flex-1 px-2 py-1 bg-dark-800 border border-dark-700 rounded-l-lg text-[10px] text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50"
              onKeyDown={e => e.key === 'Enter' && handleNumberSet()}
            />
            <button
              type="button"
              onClick={handleNumberSet}
              className="px-2 py-1 bg-dark-700 border border-dark-600 rounded-r-lg text-[10px] text-dark-300 hover:text-white transition-colors"
            >
              <Check className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
        {/* Recent contacts toggle */}
        {savedContacts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRecent(!showRecent)}
            className="px-1.5 py-1 bg-dark-800 border border-dark-700 rounded-lg text-dark-400 hover:text-dark-200 transition-colors"
            title="Contacts récents"
          >
            <User className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Recent contacts dropdown */}
      {showRecent && savedContacts.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
          {savedContacts.slice(0, 5).map(c => (
            <button
              key={c.number}
              type="button"
              onClick={() => handleSelectRecent(c)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-dark-700 transition-colors"
            >
              <Phone className="w-2.5 h-2.5 text-dark-500" />
              <span className="text-[10px] text-dark-300 flex-1 truncate">{c.name}</span>
              <span className="text-[9px] text-dark-500">{c.number}</span>
            </button>
          ))}
        </div>
      )}

      {/* Contact sélectionné */}
      {contact && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary-500/5 border border-primary-500/20 rounded-lg">
          <Phone className="w-2.5 h-2.5 text-primary-400" />
          <span className="text-[10px] text-primary-300 flex-1 truncate">{contact.name} ({contact.number})</span>
          <button type="button" onClick={() => onContactChange(null)} className="text-dark-500 hover:text-dark-300">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* Opt-in save */}
      {showSaveOpt && contact && (
        <div className="flex items-center gap-2 px-2 py-1 bg-dark-800/50 rounded-lg border border-dark-700/50">
          <Info className="w-2.5 h-2.5 text-dark-500 shrink-0" />
          <span className="text-[9px] text-dark-500 flex-1">Enregistrer ce contact localement ?</span>
          <button
            type="button"
            onClick={handleSaveContact}
            className="text-[9px] text-primary-400 hover:text-primary-300"
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() => setShowSaveOpt(false)}
            className="text-[9px] text-dark-500 hover:text-dark-300"
          >
            Non
          </button>
        </div>
      )}

      {/* Privacy notice */}
      <p className="text-[8px] text-dark-600 flex items-center gap-1">
        <Shield className="w-2 h-2" />
        Vos contacts restent privés. Enregistrement local uniquement.
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={!copyEnabled}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
            copiedIdx
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : copyEnabled
                ? 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-500'
                : 'bg-dark-800/50 text-dark-600 border border-dark-700/50 cursor-not-allowed'
          }`}
        >
          {copiedIdx ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
          {copiedIdx ? 'Copié !' : 'Copier'}
        </button>

        <div className="flex-1 relative group">
          <button
            type="button"
            onClick={onSend}
            disabled={!sendEnabled}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
              sendEnabled
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                : 'bg-dark-800/50 text-dark-600 border border-dark-700/50 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Envoyer
          </button>
          {/* Tooltip when disabled */}
          {!sendEnabled && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-dark-800 border border-dark-600 text-[10px] text-dark-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
              Sélectionne un contact pour activer l&apos;envoi
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// SUB: RuntimeChecksDisplay
// ═══════════════════════════════════════

function RuntimeChecksDisplay({ checks }: { checks: RuntimeCheck[] }) {
  if (checks.length === 0) return null

  return (
    <div className="space-y-1">
      {checks.map((check, i) => (
        <div
          key={i}
          className={`flex items-start gap-1.5 px-2 py-1 rounded-lg text-[10px] ${
            check.type === 'block' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            check.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-dark-800/50 text-dark-400 border border-dark-700/30'
          }`}
        >
          {check.type === 'block' ? <Shield className="w-2.5 h-2.5 shrink-0 mt-0.5" /> :
           check.type === 'warning' ? <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" /> :
           <Info className="w-2.5 h-2.5 shrink-0 mt-0.5" />}
          <span className="flex-1 leading-tight">{check.message}</span>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════
// MAIN: AssistantPanel
// ═══════════════════════════════════════

export default function AssistantPanel({
  inputMessage,
  outputs,
  selectedTone,
  onToneChange,
  onObjectiveChange,
  selectedObjective,
  userId,
}: AssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedOutput, setSelectedOutput] = useState<number>(0)
  const [contact, setContact] = useState<Contact | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sessionId] = useState(() => `session_${Date.now()}`)

  // Charger l'historique
  useEffect(() => {
    setHistory(getHistory())
  }, [])

  // Analyse en temps réel du message
  const analysis = useMemo(() => {
    if (!inputMessage.trim()) return null
    return runFullAnalysis(inputMessage, history, selectedObjective)
  }, [inputMessage, history, selectedObjective])

  // Auto-sélectionner l'objectif suggéré
  useEffect(() => {
    if (analysis?.suggestions.objectives[0]) {
      const suggested = analysis.suggestions.objectives[0].objectif_id
      // Ne pas écraser le choix de l'utilisateur si déjà sélectionné différemment
      if (!inputMessage.trim()) return
      onObjectiveChange(suggested)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.suggestions.objectives[0]?.objectif_id])

  // Auto-sélectionner le ton suggéré
  useEffect(() => {
    if (analysis?.suggestions.tones[0]) {
      const suggested = analysis.suggestions.tones[0].id
      onToneChange(suggested)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.suggestions.tones[0]?.id])

  // Copier le message sélectionné
  const handleCopy = useCallback(async () => {
    const text = outputs[selectedOutput]
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    // Log + historique
    addToHistory({ text, tone: selectedTone, objective: selectedObjective, contact: contact?.name })
    setHistory(getHistory())
    logAnalyticsEvent({
      user_id: userId,
      session_id: sessionId,
      message_id: `gen_${Date.now()}`,
      selected_objective: selectedObjective,
      selected_tone: selectedTone,
      contact_selected: !!contact,
      action: 'copy',
      timestamp: new Date().toISOString(),
    })
  }, [outputs, selectedOutput, selectedTone, selectedObjective, contact, userId, sessionId])

  // Envoyer via WhatsApp
  const handleSend = useCallback(() => {
    const text = outputs[selectedOutput]
    if (!text || !contact) return

    const url = buildWhatsAppUrl(contact.number, text)
    window.open(url, '_blank')

    // Log + historique
    addToHistory({ text, tone: selectedTone, objective: selectedObjective, contact: contact.name })
    setHistory(getHistory())
    saveContact(contact)
    logAnalyticsEvent({
      user_id: userId,
      session_id: sessionId,
      message_id: `gen_${Date.now()}`,
      selected_objective: selectedObjective,
      selected_tone: selectedTone,
      contact_selected: true,
      action: 'send',
      timestamp: new Date().toISOString(),
    })
  }, [outputs, selectedOutput, contact, selectedTone, selectedObjective, userId, sessionId])

  // Réutiliser un message de l'historique
  const handleReuseHistory = useCallback((text: string) => {
    // On ne peut pas modifier les outputs directement, mais on peut copier
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  // Pas de message → pas de panneau
  if (!inputMessage.trim() && outputs.length === 0) return null

  return (
    <div className="rounded-2xl border border-dark-700/60 bg-dark-900/50 backdrop-blur-sm overflow-hidden transition-all duration-300 assistant-panel-enter">
      {/* Header collapsible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-dark-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-400" />
          </div>
          <span className="text-xs font-semibold text-dark-200">Assistant</span>
          {analysis && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${interestColor(analysis.analysis.interest_level)}`}>
              {analysis.analysis.interest_level}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-dark-500" /> : <ChevronDown className="w-3.5 h-3.5 text-dark-500" />}
      </button>

      {/* Contenu du panneau */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* ═══ Section 1 : Analyse rapide ═══ */}
          {analysis && inputMessage.trim() && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-dark-500 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" />
                Analyse rapide
              </h4>
              <AnalysisSummaryCard analysis={analysis} />
            </div>
          )}

          {/* ═══ Section 2 : Suggestions d'objectif ═══ */}
          {analysis && analysis.suggestions.objectives.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-medium text-dark-500 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-2.5 h-2.5" />
                Objectif
                <span className="text-[8px] text-dark-600 font-normal normal-case ml-1">— tu gardes le contrôle</span>
              </h4>
              <ObjectiveChipGroup
                suggestions={analysis.suggestions.objectives}
                selected={selectedObjective}
                onSelect={onObjectiveChange}
              />
            </div>
          )}

          {/* ═══ Section 3 : Suggestions de ton ═══ */}
          {analysis && analysis.suggestions.tones.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-medium text-dark-500 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-2.5 h-2.5" />
                Ton
              </h4>
              <ToneChipGroup
                suggestions={analysis.suggestions.tones}
                selected={selectedTone}
                onSelect={onToneChange}
              />
            </div>
          )}

          {/* ═══ Section 4 : Runtime checks ═══ */}
          {analysis && analysis.runtime_checks.length > 0 && (
            <RuntimeChecksDisplay checks={analysis.runtime_checks} />
          )}

          {/* ═══ Section 5 : Détails (hover/chevron) ═══ */}
          {(history.length > 0 || outputs.length > 0) && (
            <details className="group" open={showDetails} onToggle={(e) => setShowDetails((e.target as HTMLDetailsElement).open)}>
              <summary className="text-[10px] text-dark-500 cursor-pointer hover:text-dark-300 transition-colors flex items-center gap-1">
                <ChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                Voir plus
              </summary>

              <div className="mt-2 space-y-3">
                {/* Historique mini */}
                {history.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-medium text-dark-500 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Derniers envois
                    </h4>
                    <HistoryMini history={history} onReuse={handleReuseHistory} />
                  </div>
                )}
              </div>
            </details>
          )}

          {/* ═══ Section 6 : Sélection sortie + Contact + Actions ═══ */}
          {outputs.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-dark-700/40">
              {/* Sélecteur de sortie */}
              {outputs.length > 1 && (
                <div className="flex gap-1">
                  {outputs.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedOutput(i)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
                        selectedOutput === i
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'bg-dark-800/50 text-dark-500 border border-dark-700/30 hover:text-dark-300'
                      }`}
                    >
                      Option {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Message sélectionné (preview) */}
              <div className="px-2 py-1.5 bg-dark-800/30 rounded-lg border border-dark-700/30">
                <p className="text-[11px] text-dark-200 leading-relaxed">
                  {outputs[selectedOutput]}
                </p>
              </div>

              {/* Contact + Envoyer */}
              <ContactSelector
                contact={contact}
                onContactChange={setContact}
                onSend={handleSend}
                onCopy={handleCopy}
                sendEnabled={!!contact && outputs.length > 0}
                copyEnabled={outputs.length > 0}
                copiedIdx={copied}
                outputText={outputs[selectedOutput] || ''}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

