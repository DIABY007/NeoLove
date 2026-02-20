/**
 * AffiliateDashboard — Tableau de bord partenaire
 * Sections compactes : Résumé KPIs | Activité récente | Balance & Payout | Ressources (partage)
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Wallet,
  Award,
  Clock,
  Clipboard,
  Check,
  Send,
  ChevronDown,
  RefreshCw,
  MessageCircle,
  ExternalLink,
  AlertTriangle,
  Shield,
} from 'lucide-react'

interface DashboardData {
  affiliate: {
    id: string
    code: string
    status: string
    balance_available: number
    balance_pending: number
    total_earned: number
    total_paid: number
    created_at: string
  }
  kpis: {
    total_leads: number
    active_leads: number
    subscribed_leads: number
    conversion_rate: number
    commission_available: number
    commission_pending: number
    total_earned: number
    total_paid: number
  }
  recent_activity: {
    id: string
    index: number
    status: string
    date: string
    commission: number
  }[]
  commissions: {
    id: string
    plan_type: string
    amount: number
    status: string
    date: string
  }[]
  payouts: {
    id: string
    amount: number
    status: string
    requested_at: string
    processed_at: string | null
  }[]
}

const SHARE_MESSAGES = [
  { label: 'Message direct', icon: '💬' },
  { label: 'Message pro', icon: '💼' },
  { label: 'Message drôle', icon: '😂' },
  { label: 'Message court', icon: '⚡' },
  { label: 'Story/statut', icon: '📱' },
  { label: 'Groupe WhatsApp', icon: '👥' },
]

export default function AffiliateDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState<number | null>(null)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState('')

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/affiliate/dashboard')
      const json = await res.json()

      if (!json.success) {
        if (res.status === 404) {
          router.push('/profile')
          return
        }
        if (res.status === 401) {
          router.push('/auth')
          return
        }
        setError(json.error || 'Erreur')
        return
      }

      setData(json.data)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleCopyLink = async () => {
    if (!data) return
    const link = `${window.location.origin}/?ref=${data.affiliate.code}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyMessage = async (index: number) => {
    if (!data) return
    const link = `${window.location.origin}/?ref=${data.affiliate.code}`
    const messages = getMessages(link)
    try {
      await navigator.clipboard.writeText(messages[index])
    } catch {
      const ta = document.createElement('textarea')
      ta.value = messages[index]
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedMsg(index)
    setTimeout(() => setCopiedMsg(null), 2000)
  }

  const handleShareWhatsApp = (index: number) => {
    if (!data) return
    const link = `${window.location.origin}/?ref=${data.affiliate.code}`
    const messages = getMessages(link)
    window.open(`https://wa.me/?text=${encodeURIComponent(messages[index])}`, '_blank')
  }

  const handlePayoutRequest = async () => {
    if (!data || data.kpis.commission_available < 1000) return
    setPayoutLoading(true)
    setPayoutMsg('')

    try {
      const res = await fetch('/api/affiliate/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: data.kpis.commission_available }),
      })

      const json = await res.json()

      if (!json.success) {
        setPayoutMsg(json.error || 'Erreur')
        return
      }

      // Ouvrir WhatsApp pour la demande
      if (json.data.whatsapp_url) {
        window.open(json.data.whatsapp_url, '_blank')
      }

      setPayoutMsg(json.data.message)
      // Rafraîchir le dashboard
      fetchDashboard()
    } catch {
      setPayoutMsg('Erreur de connexion')
    } finally {
      setPayoutLoading(false)
    }
  }

  function getMessages(link: string): string[] {
    return [
      `Yo ! J'utilise NeoLove pour mieux répondre aux messages et c'est un game-changer. Teste avec mon lien : ${link}`,
      `Salut, j'ai découvert NeoLove — un assistant qui aide à répondre aux messages de manière percutante. Essaie gratuitement : ${link}`,
      `Tu galères en DM ? NeoLove te sauve la mise ! 3 jours gratuits ici : ${link}`,
      `Teste NeoLove gratuitement : ${link}`,
      `NeoLove — l'assistant qui te fait briller en conversation. Lien : ${link}`,
      `NeoLove c'est l'app qui te génère des réponses parfaites pour tes conversations. 3 jours offerts ! ${link}`,
    ]
  }

  function statusLabel(status: string): { label: string; color: string } {
    switch (status) {
      case 'registered': return { label: 'Inscrit', color: 'text-blue-400 bg-blue-400/10' }
      case 'active': return { label: 'Actif', color: 'text-green-400 bg-green-400/10' }
      case 'subscribed': return { label: 'Abonné', color: 'text-primary-400 bg-primary-400/10' }
      case 'rejected': return { label: 'Rejeté', color: 'text-red-400 bg-red-400/10' }
      case 'review': return { label: 'En revue', color: 'text-amber-400 bg-amber-400/10' }
      default: return { label: status, color: 'text-dark-400 bg-dark-700' }
    }
  }

  function commissionStatusLabel(status: string): { label: string; color: string } {
    switch (status) {
      case 'pending': return { label: 'En attente', color: 'text-amber-400' }
      case 'confirmed': return { label: 'Confirmée', color: 'text-green-400' }
      case 'paid': return { label: 'Payée', color: 'text-primary-400' }
      case 'revoked': return { label: 'Révoquée', color: 'text-red-400' }
      default: return { label: status, color: 'text-dark-400' }
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "à l'instant"
    if (mins < 60) return `il y a ${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `il y a ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `il y a ${days}j`
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-red-400 text-sm">{error || 'Données indisponibles'}</p>
        <button onClick={() => router.push('/profile')} className="btn-secondary text-sm py-2 px-4">
          Retour au profil
        </button>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Tableau de bord partenaire – NeoLove</title>
      </Head>
      <main className="min-h-screen max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1.5 text-dark-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Profil
          </button>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1 text-dark-500 hover:text-dark-300 transition-colors text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Actualiser
          </button>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            Tableau de bord partenaire
          </h1>
          <p className="text-xs text-dark-500 mt-1">
            Partenaire depuis {new Date(data.affiliate.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Code partenaire + lien */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400">Ton code partenaire</span>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-all ${
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-dark-700 text-dark-300 hover:text-white'
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
              {copied ? 'Copié !' : 'Copier le lien'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-primary-400 font-mono tracking-wider">{data.affiliate.code}</span>
            <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-dark-800 rounded-lg overflow-hidden">
              <ExternalLink className="w-3 h-3 text-dark-500 shrink-0" />
              <span className="text-[10px] text-dark-500 truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/?ref={data.affiliate.code}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ KPIs ═══ */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Comptes créés', value: data.kpis.total_leads, icon: Users, sublabel: '(anonymisés)' },
            { label: 'Licences activées', value: data.kpis.subscribed_leads, icon: Award, sublabel: '' },
            { label: 'Taux de conversion', value: `${data.kpis.conversion_rate}%`, icon: TrendingUp, sublabel: '' },
            { label: 'Commission disponible', value: `${data.kpis.commission_available.toLocaleString('fr-FR')}`, icon: Wallet, sublabel: 'FCFA' },
          ].map((kpi, i) => (
            <div key={i} className="card py-4 px-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <kpi.icon className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-[10px] text-dark-500 uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-white">
                {kpi.value}
                {kpi.sublabel && <span className="text-xs text-dark-500 font-normal ml-1">{kpi.sublabel}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Totaux financiers */}
        <div className="flex gap-3">
          <div className="flex-1 px-3 py-2 bg-dark-800/50 rounded-xl border border-dark-700/50 flex items-center justify-between">
            <span className="text-[10px] text-dark-500">Total gagné</span>
            <span className="text-sm font-semibold text-white">{data.kpis.total_earned.toLocaleString('fr-FR')} <span className="text-[10px] text-dark-500">FCFA</span></span>
          </div>
          <div className="flex-1 px-3 py-2 bg-dark-800/50 rounded-xl border border-dark-700/50 flex items-center justify-between">
            <span className="text-[10px] text-dark-500">Total payé</span>
            <span className="text-sm font-semibold text-white">{data.kpis.total_paid.toLocaleString('fr-FR')} <span className="text-[10px] text-dark-500">FCFA</span></span>
          </div>
        </div>

        {/* ═══ Activité récente (anonymisée) ═══ */}
        <details className="group card">
          <summary className="flex items-center justify-between cursor-pointer">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" />
              Activité récente
            </h3>
            <ChevronDown className="w-4 h-4 text-dark-500 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="mt-3 space-y-1.5">
            {data.recent_activity.length === 0 ? (
              <p className="text-xs text-dark-500 text-center py-3">Aucune activité pour le moment</p>
            ) : (
              data.recent_activity.map(lead => {
                const s = statusLabel(lead.status)
                return (
                  <div key={lead.id} className="flex items-center gap-2 py-1.5 px-2 bg-dark-800/30 rounded-lg">
                    <span className="text-[10px] text-dark-600 w-6 text-right">#{lead.index}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    <span className="flex-1 text-[10px] text-dark-500">{timeAgo(lead.date)}</span>
                    {lead.commission > 0 && (
                      <span className="text-[10px] text-green-400 font-medium">+{lead.commission.toLocaleString('fr-FR')}</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </details>

        {/* ═══ Commissions ═══ */}
        {data.commissions.length > 0 && (
          <details className="group card">
            <summary className="flex items-center justify-between cursor-pointer">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary-400" />
                Commissions
              </h3>
              <ChevronDown className="w-4 h-4 text-dark-500 group-open:rotate-180 transition-transform" />
            </summary>

            <div className="mt-3 space-y-1.5">
              {data.commissions.map(c => {
                const s = commissionStatusLabel(c.status)
                return (
                  <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 bg-dark-800/30 rounded-lg">
                    <span className="text-[10px] text-dark-500">{c.plan_type}</span>
                    <span className="text-xs font-medium text-white flex-1">+{c.amount.toLocaleString('fr-FR')} FCFA</span>
                    <span className={`text-[10px] ${s.color}`}>{s.label}</span>
                    <span className="text-[9px] text-dark-600">{timeAgo(c.date)}</span>
                  </div>
                )
              })}
            </div>
          </details>
        )}

        {/* ═══ Balance & Payout ═══ */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary-400" />
            Récupérer ma commission
          </h3>

          <div className="flex items-center justify-between px-3 py-2.5 bg-primary-500/10 border border-primary-500/20 rounded-xl">
            <span className="text-sm text-dark-300">Solde disponible</span>
            <span className="text-lg font-bold text-primary-400">{data.kpis.commission_available.toLocaleString('fr-FR')} <span className="text-xs font-normal">FCFA</span></span>
          </div>

          {data.kpis.commission_available >= 1000 ? (
            <button
              onClick={handlePayoutRequest}
              disabled={payoutLoading}
              className="btn-primary w-full py-3 text-sm"
            >
              {payoutLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Envoi en cours...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Récupérer via WhatsApp
                </span>
              )}
            </button>
          ) : (
            <p className="text-xs text-dark-500 text-center">
              Minimum 1 000 FCFA pour demander un paiement
            </p>
          )}

          {payoutMsg && (
            <p className="text-xs text-center text-green-400">{payoutMsg}</p>
          )}

          {/* Privacy notice */}
          <p className="text-[9px] text-dark-600 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" />
            Vos données et celles de vos filleuls restent privées. Aucune identité n&apos;est exposée.
          </p>
        </div>

        {/* ═══ Ressources : messages à partager ═══ */}
        <details className="group card">
          <summary className="flex items-center justify-between cursor-pointer">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-primary-400" />
              Messages prêts à partager
            </h3>
            <ChevronDown className="w-4 h-4 text-dark-500 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="mt-3 space-y-2">
            {SHARE_MESSAGES.map((msg, i) => (
              <div key={i} className="p-2.5 bg-dark-800/30 rounded-xl border border-dark-700/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-dark-400 flex items-center gap-1">
                    {msg.label}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopyMessage(i)}
                      className={`p-1 rounded-lg transition-all ${
                        copiedMsg === i
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-dark-700 text-dark-400 hover:text-white'
                      }`}
                      title="Copier"
                    >
                      {copiedMsg === i ? <Check className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(i)}
                      className="p-1 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-all"
                      title="Envoyer sur WhatsApp"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-dark-300 leading-relaxed">
                  {data ? getMessages(`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${data.affiliate.code}`)[i]?.slice(0, 80) + '…' : ''}
                </p>
              </div>
            ))}
          </div>
        </details>

        {/* Payouts history */}
        {data.payouts.length > 0 && (
          <details className="group card">
            <summary className="flex items-center justify-between cursor-pointer">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary-400" />
                Historique des paiements
              </h3>
              <ChevronDown className="w-4 h-4 text-dark-500 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-1.5">
              {data.payouts.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 bg-dark-800/30 rounded-lg">
                  <span className="text-xs font-medium text-white flex-1">{p.amount.toLocaleString('fr-FR')} FCFA</span>
                  <span className={`text-[10px] ${
                    p.status === 'paid' ? 'text-green-400' :
                    p.status === 'rejected' ? 'text-red-400' :
                    'text-amber-400'
                  }`}>{p.status === 'paid' ? 'Payé' : p.status === 'rejected' ? 'Rejeté' : p.status === 'processing' ? 'En cours' : 'Demandé'}</span>
                  <span className="text-[9px] text-dark-600">{timeAgo(p.requested_at)}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Footer */}
        <button
          onClick={() => router.push('/chat')}
          className="btn-secondary w-full text-sm"
        >
          <span className="flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Retour au chat
          </span>
        </button>
      </main>
    </>
  )
}

