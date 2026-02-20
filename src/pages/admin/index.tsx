import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { PLANS } from '@/lib/constants'
import type { PlanType } from '@/lib/constants'
import { Shield, MessageCircle, Key, CheckCircle, Clipboard, Users } from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  phone_number: string
  role: string
  created_at: string
  licenses: Array<{
    id: string
    plan_type: string
    status: string
    expires_at: string | null
  }>
}

interface Stats {
  totalUsers: number
  totalGenerations: number
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalGenerations: 0 })
  const [loading, setLoading] = useState(true)
  const [planType, setPlanType] = useState<PlanType>('trial')
  const [codeCount, setCodeCount] = useState(1)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Charger les données
  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (data.error === 'Accès refusé') {
            router.push('/chat')
          }
          return
        }
        setUsers(data.data.users || [])
        setStats(data.data.stats || { totalUsers: 0, totalGenerations: 0 })
      })
      .catch(() => router.push('/auth'))
      .finally(() => setLoading(false))
  }, [router])

  // Générer des codes de licence
  const handleGenerateCodes = async () => {
    setGenerating(true)
    setError('')
    setGeneratedCodes([])

    try {
      const res = await fetch('/api/admin/generate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType, count: codeCount }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Erreur')
        return
      }

      setGeneratedCodes(data.data.codes.map((c: { code: string }) => c.code))
    } catch {
      setError('Erreur de connexion')
    } finally {
      setGenerating(false)
    }
  }

  const copyCode = (code: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code)
    } else {
      // Fallback pour HTTP / navigateurs sans clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Admin – NeoLove</title>
      </Head>
      <main className="min-h-screen max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-primary-400" /> Dashboard Admin</h1>
          <button onClick={() => router.push('/chat')} className="btn-secondary text-sm py-2 px-4">
            <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Chat</span>
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-400">{stats.totalUsers}</div>
            <div className="text-xs text-dark-400 mt-1">Utilisateurs</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-400">{stats.totalGenerations}</div>
            <div className="text-xs text-dark-400 mt-1">Générations</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-400">
              {users.filter(u => u.licenses.some(l => l.status === 'active')).length}
            </div>
            <div className="text-xs text-dark-400 mt-1">Licences actives</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-orange-400">
              {users.filter(u => u.created_at && new Date(u.created_at) > new Date(Date.now() - 86400000)).length}
            </div>
            <div className="text-xs text-dark-400 mt-1">Nouveaux (24h)</div>
          </div>
        </div>

        {/* Génération de codes */}
        <div className="card mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-primary-400" /> Générer des codes de licence</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Plan</label>
              <select
                value={planType}
                onChange={e => setPlanType(e.target.value as PlanType)}
                className="input-field py-2 text-sm"
              >
                {PLANS.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.duration})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Quantité</label>
              <input
                type="number"
                min={1}
                max={50}
                value={codeCount}
                onChange={e => setCodeCount(Number(e.target.value))}
                className="input-field py-2 text-sm w-20"
              />
            </div>
            <button onClick={handleGenerateCodes} disabled={generating} className="btn-primary py-2 px-4 text-sm">
              {generating ? '...' : 'Générer'}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

          {generatedCodes.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-green-400 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Codes générés :</h3>
              {generatedCodes.map(code => (
                <div key={code} className="flex items-center gap-2 bg-dark-800 rounded-xl px-3 py-2">
                  <code className="text-primary-400 font-mono text-sm flex-1">{code}</code>
                  <button
                    onClick={() => copyCode(code)}
                    className="text-xs text-dark-400 hover:text-white transition-colors"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liste utilisateurs */}
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary-400" /> Utilisateurs ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-dark-400 text-left">
                  <th className="pb-3 font-medium">Nom</th>
                  <th className="pb-3 font-medium">Téléphone</th>
                  <th className="pb-3 font-medium">Licence</th>
                  <th className="pb-3 font-medium">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {users.map(u => {
                  const activeLicense = u.licenses.find(l => l.status === 'active')
                  return (
                    <tr key={u.id} className="text-dark-300">
                      <td className="py-3">{u.name}</td>
                      <td className="py-3 font-mono text-xs">{u.phone_number}</td>
                      <td className="py-3">
                        {activeLicense ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                            {activeLicense.plan_type}
                          </span>
                        ) : (
                          <span className="text-xs bg-dark-700 text-dark-400 px-2 py-1 rounded-full">
                            Aucune
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-xs">
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}

