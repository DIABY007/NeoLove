import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { MessageCircle, Sparkles, AlertTriangle, Key, Lightbulb, Gem, Settings } from 'lucide-react'

interface UserData {
  id: string
  name: string
  phone_number: string
  role: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [hasLicense, setHasLicense] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [licenseCode, setLicenseCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Charger les données utilisateur
  const fetchUserData = () => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          router.push('/auth')
          return
        }
        setUser(data.data.user)
        setHasLicense(data.data.hasActiveLicense)
        setDaysRemaining(data.data.daysRemaining || 0)
        setExpiresAt(data.data.expiresAt || null)
      })
      .catch(() => router.push('/auth'))
  }

  // Vérifier l'authentification
  useEffect(() => {
    fetchUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Activer une licence
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseCode.trim()) return

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/licenses/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: licenseCode }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Code invalide')
        return
      }

      setMessage(data.data.message)
      setHasLicense(true)
      setLicenseCode('')
      // Rafraîchir les données (jours restants, etc.)
      fetchUserData()
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // Déconnexion
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
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
        <title>Profil – NeoLove</title>
      </Head>
      <main className="min-h-screen max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Mon Profil</h1>
          {hasLicense && (
            <button
              onClick={() => router.push('/chat')}
              className="btn-secondary text-sm py-2 px-4"
            >
              <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Chat</span>
            </button>
          )}
        </div>

        {/* Info utilisateur */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{user.name}</h2>
              <p className="text-dark-400 text-sm">{user.phone_number}</p>
            </div>
          </div>
        </div>

        {/* Statut licence + jours restants */}
        <div className={`card mb-6 ${hasLicense ? 'border-green-500/30' : 'border-orange-500/30'}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`w-3 h-3 rounded-full ${hasLicense ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
            <h3 className="font-medium text-white">
              {hasLicense ? <span className="flex items-center gap-1.5">Licence active <Sparkles className="w-4 h-4 text-primary-400" /></span> : 'Aucune licence active'}
            </h3>
          </div>

          {hasLicense && daysRemaining > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-dark-400 text-sm">Temps restant</p>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${daysRemaining <= 3 ? 'text-orange-400' : 'text-green-400'}`}>
                  {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                </span>
                {daysRemaining <= 3 && (
                  <span className="text-xs text-orange-400 animate-pulse flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expire bientôt</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-dark-400 text-sm">
              Activez un code ou choisissez un plan pour commencer.
            </p>
          )}

          {hasLicense && expiresAt && (
            <p className="text-dark-500 text-xs mt-2">
              Expire le {new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Activation de licence (toujours visible pour l'accumulation) */}
        <div className="card mb-6">
          <h3 className="font-medium text-white mb-2 flex items-center gap-2"><Key className="w-4 h-4 text-primary-400" /> Activer un code</h3>
          {hasLicense && (
            <p className="text-dark-400 text-xs mb-3 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> Le temps sera ajouté à votre licence existante.
            </p>
          )}
          <form onSubmit={handleActivate} className="space-y-3">
            <input
              type="text"
              value={licenseCode}
              onChange={e => setLicenseCode(e.target.value.toUpperCase())}
              placeholder="Entrez votre code de licence"
              className="input-field font-mono text-center tracking-widest"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={loading || !licenseCode.trim()}
              className="btn-primary w-full"
            >
              {loading ? 'Activation...' : 'Activer'}
            </button>
          </form>

          {error && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center">
              {message}
            </div>
          )}
        </div>

        {/* Bouton voir les plans */}
        <button
          onClick={() => router.push('/pricing')}
          className="btn-secondary w-full mb-6"
        >
          <span className="flex items-center justify-center gap-2"><Gem className="w-4 h-4" /> Voir les plans</span>
        </button>

        {/* Bouton Admin Dashboard (visible uniquement pour les admins) */}
        {user.role === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            className="w-full mb-6 py-3 px-4 bg-dark-800 border border-dark-600 rounded-2xl text-white text-sm font-medium hover:bg-dark-700 transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" /> Dashboard Admin
          </button>
        )}

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="w-full text-center text-dark-500 text-sm hover:text-red-400 transition-colors py-4"
        >
          Se déconnecter
        </button>
      </main>
    </>
  )
}

