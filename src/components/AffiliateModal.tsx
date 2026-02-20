/**
 * AffiliateModal — Modal d'inscription au programme partenaire
 * Étape 1 : explication + CTA "Obtenir mon code"
 * Étape 2 : code généré + CTA partager (copier / WhatsApp) + confirmation envoi WhatsApp
 */

import { useState } from 'react'
import {
  X,
  Users,
  TrendingUp,
  Shield,
  Clipboard,
  Check,
  Send,
  ExternalLink,
  Sparkles,
  MessageCircle,
} from 'lucide-react'

interface AffiliateModalProps {
  isOpen: boolean
  onClose: () => void
  onCodeGenerated: (code: string) => void
}

export default function AffiliateModal({ isOpen, onClose, onCodeGenerated }: AffiliateModalProps) {
  const [step, setStep] = useState<'intro' | 'code'>('intro')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [whatsappSent, setWhatsappSent] = useState(false)

  if (!isOpen) return null

  const handleGenerateCode = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/affiliate/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Erreur lors de la génération')
        return
      }

      setCode(data.data.code)
      setWhatsappSent(!!data.data.whatsapp_sent)
      setStep('code')
      onCodeGenerated(data.data.code)
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    const link = `${window.location.origin}/?ref=${code}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareWhatsApp = () => {
    const link = `${window.location.origin}/?ref=${code}`
    const message = `🔥 Yo ! J'utilise NeoLove pour mieux répondre aux messages et c'est un game-changer. Teste gratuitement avec mon lien : ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleClose = () => {
    onClose()
    if (step === 'intro') {
      setError('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-dark-900 border border-dark-700 rounded-3xl shadow-2xl overflow-hidden animate-in">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl bg-dark-800 text-dark-400 hover:text-white transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {step === 'intro' ? (
          /* ═══ ÉTAPE 1 : Explication ═══ */
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="text-center pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-500/20 mb-3">
                <Users className="w-6 h-6 text-primary-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Devenir partenaire</h2>
              <p className="text-sm text-dark-400 mt-1">
                Recommande NeoLove et gagne des commissions. Simple, transparent, sécurisé.
              </p>
            </div>

            {/* Taux de commission */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Commissions par parrainage</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { plan: '1 mois', price: '5K', commission: '1 000' },
                  { plan: '3 mois', price: '12K', commission: '2 000' },
                  { plan: '6 mois', price: '20K', commission: '4 000' },
                ].map(item => (
                  <div key={item.plan} className="text-center p-2.5 bg-dark-800 rounded-xl border border-dark-700">
                    <p className="text-[10px] text-dark-500">{item.plan}</p>
                    <p className="text-sm font-bold text-primary-400 mt-0.5">{item.commission}</p>
                    <p className="text-[9px] text-dark-500">FCFA</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Avantages */}
            <div className="space-y-2">
              {[
                { icon: TrendingUp, text: 'Commission sur chaque abonnement activé' },
                { icon: Shield, text: 'Suivi transparent et anonymisé' },
                { icon: Sparkles, text: 'Paiement via Mobile Money' },
                { icon: MessageCircle, text: 'Code envoyé sur ton WhatsApp' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-dark-300">
                  <item.icon className="w-4 h-4 text-primary-400 shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Erreur */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center leading-relaxed">
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleGenerateCode}
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Génération en cours...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Obtenir mon code
                </span>
              )}
            </button>
          </div>
        ) : (
          /* ═══ ÉTAPE 2 : Code obtenu ═══ */
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="text-center pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-500/20 mb-3">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Ton code partenaire</h2>
              {whatsappSent && (
                <p className="text-xs text-green-400 mt-1 flex items-center justify-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  Code envoyé sur ton WhatsApp !
                </p>
              )}
            </div>

            {/* Code */}
            <div className="text-center py-3 px-4 bg-dark-800 rounded-2xl border border-primary-500/30">
              <p className="text-2xl font-bold text-primary-400 font-mono tracking-widest">{code}</p>
              <p className="text-[10px] text-dark-500 mt-1">Partage ce code ou ton lien personnalisé</p>
            </div>

            {/* Lien */}
            <div className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-xl border border-dark-700">
              <ExternalLink className="w-3.5 h-3.5 text-dark-500 shrink-0" />
              <span className="text-xs text-dark-300 truncate flex-1">
                {typeof window !== 'undefined' ? window.location.origin : ''}/?ref={code}
              </span>
            </div>

            {/* Confirmation WhatsApp */}
            {whatsappSent && (
              <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-400">Envoyé par WhatsApp</p>
                  <p className="text-[10px] text-dark-400">Ton code et lien sont dans tes messages WhatsApp</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyCode}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-500'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 transition-all"
              >
                <Send className="w-4 h-4" />
                Partager
              </button>
            </div>

            {/* CTA vers dashboard */}
            <button
              onClick={handleClose}
              className="w-full text-center text-xs text-dark-500 hover:text-dark-300 transition-colors py-2"
            >
              Fermer — retrouve ton tableau de bord depuis ton profil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
