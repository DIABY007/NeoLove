import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { TONES } from '@/lib/constants'
import type { ToneId, ObjectiveId } from '@/lib/constants'
import NeoLoveLogo from '@/components/NeoLoveLogo'
import AssistantPanel from '@/components/AssistantPanel'
import { logAnalyticsEvent } from '@/lib/assistant-engine'
import {
  Hand,
  Mail,
  Sparkles,
  Lightbulb,
  Clipboard,
  Check,
} from 'lucide-react'

interface UserData {
  id: string
  name: string
  phone_number: string
  role: string
}

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [context, setContext] = useState('')
  const [selectedTone, setSelectedTone] = useState<ToneId>('taquin')
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveId>('créer_complicité')
  const [outputs, setOutputs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}`)

  // Vérifier l'authentification
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          router.push('/auth')
          return
        }
        if (!data.data.hasActiveLicense) {
          router.push('/profile')
          return
        }
        setUser(data.data.user)
      })
      .catch(() => router.push('/auth'))
  }, [router])

  // Générer les réponses
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    setError('')
    setLoading(true)
    setOutputs([])

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_message: inputMessage,
          tone: selectedTone,
          context: context || undefined,
          objective: selectedObjective,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Erreur de génération')
        return
      }

      setOutputs(data.data.outputs)

      // Analytics log
      if (user) {
        logAnalyticsEvent({
          user_id: user.id,
          session_id: sessionId,
          message_id: data.data.generation_id || `gen_${Date.now()}`,
          selected_objective: selectedObjective,
          selected_tone: selectedTone,
          contact_selected: false,
          action: 'generate',
          timestamp: new Date().toISOString(),
        })
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // Copier un message
  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Chat – NeoLove</title>
      </Head>
      <main className="min-h-screen flex flex-col max-w-lg mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl overflow-hidden">
                <NeoLoveLogo size={36} />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">NeoLove</h1>
                <p className="text-xs text-dark-400 flex items-center gap-1">Salut, {user.name} <Hand className="w-3 h-3" /></p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/profile')}
                className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
                title="Profil"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Zone de saisie */}
        <form onSubmit={handleGenerate} className="flex-1 px-4 py-6 space-y-5">
          {/* Message reçu */}
          <div>
            <label className="text-sm font-medium text-dark-300 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary-400" /> Message reçu
            </label>
            <textarea
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="Collez ici le message auquel vous voulez répondre..."
              className="input-field min-h-[100px] resize-none"
              maxLength={500}
              required
            />
            <div className="text-xs text-dark-500 mt-1 text-right">
              {inputMessage.length}/500
            </div>
          </div>

          {/* ═══ PANNEAU ASSISTANT ═══ */}
          <AssistantPanel
            inputMessage={inputMessage}
            outputs={outputs}
            selectedTone={selectedTone}
            onToneChange={setSelectedTone}
            onObjectiveChange={setSelectedObjective}
            selectedObjective={selectedObjective}
            userId={user.id}
          />

          {/* Contexte (optionnel) */}
          <div>
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className="text-sm text-dark-400 hover:text-dark-300 transition-colors flex items-center gap-1"
            >
              <svg className={`w-4 h-4 transition-transform ${showContext ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Ajouter du contexte (optionnel)
            </button>
            {showContext && (
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Ex: On se connaît depuis 2 semaines, elle est un peu distante..."
                className="input-field mt-2 min-h-[60px] resize-none text-sm"
                maxLength={300}
              />
            )}
          </div>

          {/* Bouton Générer */}
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="btn-primary w-full py-4 text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Génération en cours...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" /> Générer des réponses</span>
            )}
          </button>

          {/* Erreur */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Résultats */}
          {outputs.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary-400" /> {outputs.length} proposition{outputs.length > 1 ? 's' : ''} générée{outputs.length > 1 ? 's' : ''}
              </h3>
              {outputs.map((output, index) => (
                <div
                  key={index}
                  className="glass-card group cursor-pointer hover:border-primary-500/30 transition-all"
                  onClick={() => handleCopy(output, index)}
                >
                  <p className="text-white text-sm leading-relaxed pr-8">{output}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-dark-500">
                      Option {index + 1}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(output, index) }}
                      className={`text-xs px-3 py-1 rounded-full transition-all ${
                        copiedIndex === index
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-dark-700 text-dark-400 group-hover:bg-primary-500/20 group-hover:text-primary-400'
                      }`}
                    >
                      {copiedIndex === index ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Copié !</span> : <span className="flex items-center gap-1"><Clipboard className="w-3 h-3" /> Copier</span>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>
      </main>
    </>
  )
}
