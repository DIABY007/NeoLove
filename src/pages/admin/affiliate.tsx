/**
 * Dashboard Admin — Programme d'affiliation
 *
 * Widgets : KPIs, Timeline, Top affiliés, Leads, Commissions, Alertes, Export
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  Shield, ArrowLeft, Users, TrendingUp, AlertTriangle,
  Download, RefreshCw, ChevronDown, ChevronUp,
  DollarSign, UserPlus, FileText, Activity,
  Eye, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react'

// ═══════════════ TYPES ═══════════════

interface KPIs {
  partners_active: number
  partners_total: number
  leads_via_affiliate: number
  leads_period: number
  paid_licenses_via_affiliate: number
  paid_licenses_period: number
  commission_accrued: number
  commission_accrued_period: number
  commission_paid: number
  conversion_rate_affiliate: number
  avg_commission_per_affiliate: number
  fraud_flags: number
  fraud_flags_period: number
  payouts_pending: number
  total_payout_paid: number
}

interface TopAffiliate {
  affiliate_id: string
  code: string
  status: string
  leads_count: number
  conversions_count: number
  conversion_rate: number
  total_earned: number
  balance_available: number
  avg_quality_score: number | null
  fraud_flags: number
  created_at: string
}

interface Lead {
  lead_id: string
  affiliate_code: string
  status: string
  quality_score: number | null
  is_duplicate: boolean
  ip_hash_prefix: string | null
  date: string
}

interface Commission {
  commission_id: string
  affiliate_code: string
  lead_id: string
  plan_type: string
  amount: number
  status: string
  created_at: string
  confirmed_at: string | null
  paid_at: string | null
  revoked_at: string | null
  revoke_reason: string | null
}

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  rule: string
  message: string
  value: number
  threshold: number
  triggered: boolean
  details?: string
}

// ═══════════════ HELPERS ═══════════════

function formatFCFA(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' F'
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    suspended: 'bg-yellow-500/20 text-yellow-400',
    revoked: 'bg-red-500/20 text-red-400',
    registered: 'bg-blue-500/20 text-blue-400',
    subscribed: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    review: 'bg-orange-500/20 text-orange-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-green-500/20 text-green-400',
    paid: 'bg-emerald-500/20 text-emerald-400',
    requested: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-yellow-500/20 text-yellow-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-dark-700 text-dark-400'}`}>
      {status}
    </span>
  )
}

function severityIcon(severity: string) {
  switch (severity) {
    case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    default: return <Activity className="w-4 h-4 text-blue-400" />
  }
}

// ═══════════════ MAIN COMPONENT ═══════════════

export default function AdminAffiliateDashboard() {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [planBreakdown, setPlanBreakdown] = useState<Record<string, { count: number; total: number }>>({})
  const [topAffiliates, setTopAffiliates] = useState<TopAffiliate[]>([])
  const [topMetric, setTopMetric] = useState('commissions')
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsPage, setLeadsPage] = useState(1)
  const [leadsTotalPages, setLeadsTotalPages] = useState(1)
  const [leadsStatus, setLeadsStatus] = useState('')
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [commissionsPage, setCommissionsPage] = useState(1)
  const [commissionsTotalPages, setCommissionsTotalPages] = useState(1)
  const [commissionsStatus, setCommissionsStatus] = useState('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertsTriggered, setAlertsTriggered] = useState(0)
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'commissions' | 'alerts'>('overview')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    kpi: true, top: true, breakdown: false,
  })

  // ── Fetch helpers ──
  const fetchJSON = async (url: string) => {
    const res = await fetch(url)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Erreur API')
    return data.data
  }

  const fetchSummary = useCallback(async () => {
    const data = await fetchJSON(`/api/admin/affiliate/summary?from=${dateFrom}&to=${dateTo}`)
    setKpis(data.kpis)
    setPlanBreakdown(data.plan_breakdown || {})
  }, [dateFrom, dateTo])

  const fetchTop = useCallback(async () => {
    const data = await fetchJSON(`/api/admin/affiliate/top?metric=${topMetric}&limit=20`)
    setTopAffiliates(data.affiliates || [])
  }, [topMetric])

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams({ page: String(leadsPage), per_page: '20' })
    if (leadsStatus) params.set('status', leadsStatus)
    const data = await fetchJSON(`/api/admin/affiliate/leads?${params}`)
    setLeads(data.leads || [])
    setLeadsTotalPages(data.pagination?.total_pages || 1)
  }, [leadsPage, leadsStatus])

  const fetchCommissions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(commissionsPage), per_page: '20' })
    if (commissionsStatus) params.set('status', commissionsStatus)
    params.set('from', dateFrom)
    params.set('to', dateTo)
    const data = await fetchJSON(`/api/admin/affiliate/commissions?${params}`)
    setCommissions(data.commissions || [])
    setCommissionsTotalPages(data.pagination?.total_pages || 1)
  }, [commissionsPage, commissionsStatus, dateFrom, dateTo])

  const fetchAlerts = useCallback(async () => {
    const data = await fetchJSON('/api/admin/affiliate/alerts')
    setAlerts(data.alerts || [])
    setAlertsTriggered(data.triggered_count || 0)
  }, [])

  // ── Initial load ──
  useEffect(() => {
    Promise.all([fetchSummary(), fetchTop(), fetchAlerts()])
      .catch(() => router.push('/admin'))
      .finally(() => setLoading(false))
  }, [fetchSummary, fetchTop, fetchAlerts, router])

  // ── Reload on tab change ──
  useEffect(() => {
    if (activeTab === 'leads') fetchLeads()
    if (activeTab === 'commissions') fetchCommissions()
  }, [activeTab, fetchLeads, fetchCommissions])

  // ── Refresh ──
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchSummary(), fetchTop(), fetchAlerts(), fetchLeads(), fetchCommissions()])
    setRefreshing(false)
  }

  // ── Export ──
  const handleExport = (scope: string, format: string) => {
    const params = new URLSearchParams({ scope, format, from: dateFrom, to: dateTo })
    window.open(`/api/admin/affiliate/export?${params}`, '_blank')
  }

  // ── Toggle section ──
  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  // ═══════════════ RENDER ═══════════════

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
        <title>Admin Affiliation — NeoLove</title>
      </Head>

      <main className="min-h-screen max-w-6xl mx-auto px-4 py-6">
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-dark-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-400" />
              Programme d&apos;affiliation
            </h1>
            {alertsTriggered > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium animate-pulse">
                {alertsTriggered} alerte{alertsTriggered > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input-field py-1.5 px-2 text-xs w-32"
            />
            <span className="text-dark-500 text-xs">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input-field py-1.5 px-2 text-xs w-32"
            />

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 mb-6 bg-dark-900/50 rounded-2xl p-1 overflow-x-auto">
          {[
            { id: 'overview' as const, label: 'Vue d\'ensemble', icon: TrendingUp },
            { id: 'leads' as const, label: 'Leads', icon: UserPlus },
            { id: 'commissions' as const, label: 'Commissions', icon: DollarSign },
            { id: 'alerts' as const, label: `Alertes${alertsTriggered > 0 ? ` (${alertsTriggered})` : ''}`, icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'}
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════ */}
        {/*   TAB: OVERVIEW                         */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'overview' && kpis && (
          <>
            {/* KPI Header Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
              <KPICard label="Partenaires actifs" value={kpis.partners_active} total={kpis.partners_total} icon={Users} color="text-primary-400" />
              <KPICard label="Leads via affilié" value={kpis.leads_period} total={kpis.leads_via_affiliate} icon={UserPlus} color="text-blue-400" />
              <KPICard label="Licences payées" value={kpis.paid_licenses_period} total={kpis.paid_licenses_via_affiliate} icon={FileText} color="text-green-400" />
              <KPICard label="Commission accrued" value={formatFCFA(kpis.commission_accrued_period)} total={formatFCFA(kpis.commission_accrued)} icon={DollarSign} color="text-yellow-400" isCurrency />
              <KPICard label="Commission payée" value={formatFCFA(kpis.commission_paid)} total={formatFCFA(kpis.total_payout_paid)} suffix="payouts" icon={TrendingUp} color="text-emerald-400" isCurrency />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="card p-4 text-center">
                <div className="text-lg font-bold text-white">{kpis.conversion_rate_affiliate}%</div>
                <div className="text-xs text-dark-400">Taux de conversion</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-lg font-bold text-white">{formatFCFA(kpis.avg_commission_per_affiliate)}</div>
                <div className="text-xs text-dark-400">Avg commission/affilié</div>
              </div>
              <div className="card p-4 text-center">
                <div className={`text-lg font-bold ${kpis.fraud_flags > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {kpis.fraud_flags}
                </div>
                <div className="text-xs text-dark-400">Fraud flags ({kpis.fraud_flags_period} période)</div>
              </div>
              <div className="card p-4 text-center">
                <div className={`text-lg font-bold ${kpis.payouts_pending > 0 ? 'text-yellow-400' : 'text-white'}`}>
                  {kpis.payouts_pending}
                </div>
                <div className="text-xs text-dark-400">Payouts en attente</div>
              </div>
            </div>

            {/* Plan Breakdown (collapsible) */}
            <div className="card mb-6">
              <button
                onClick={() => toggleSection('breakdown')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary-400" />
                  Répartition par plan
                </h3>
                {expandedSections.breakdown ? <ChevronUp className="w-4 h-4 text-dark-400" /> : <ChevronDown className="w-4 h-4 text-dark-400" />}
              </button>
              {expandedSections.breakdown && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(planBreakdown).map(([plan, data]) => (
                    <div key={plan} className="bg-dark-800/50 rounded-xl p-3">
                      <div className="text-xs text-dark-400 mb-1 uppercase">{plan}</div>
                      <div className="text-lg font-bold text-white">{data.count}</div>
                      <div className="text-xs text-dark-400">{formatFCFA(data.total)}</div>
                    </div>
                  ))}
                  {Object.keys(planBreakdown).length === 0 && (
                    <div className="col-span-4 text-center text-dark-500 text-sm py-4">Aucune commission encore</div>
                  )}
                </div>
              )}
            </div>

            {/* Top Affiliés */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-400" />
                  Top affiliés
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={topMetric}
                    onChange={e => setTopMetric(e.target.value)}
                    className="input-field py-1 px-2 text-xs w-auto"
                  >
                    <option value="commissions">Par commission</option>
                    <option value="leads">Par leads</option>
                    <option value="conversions">Par conversions</option>
                  </select>
                  <button onClick={() => handleExport('summary', 'csv')} className="text-dark-400 hover:text-white transition-colors" title="Exporter CSV">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-dark-400 text-left border-b border-dark-800">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Statut</th>
                      <th className="pb-2 font-medium text-right">Leads</th>
                      <th className="pb-2 font-medium text-right">Conv.</th>
                      <th className="pb-2 font-medium text-right">Taux</th>
                      <th className="pb-2 font-medium text-right">Gagné</th>
                      <th className="pb-2 font-medium text-right">Solde</th>
                      <th className="pb-2 font-medium text-right">Qualité</th>
                      <th className="pb-2 font-medium text-right">Fraud</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800/50">
                    {topAffiliates.map((aff, i) => (
                      <tr key={aff.affiliate_id} className="text-dark-300 hover:bg-dark-800/30 transition-colors">
                        <td className="py-2.5 text-dark-500">{i + 1}</td>
                        <td className="py-2.5 font-mono text-primary-400">{aff.code}</td>
                        <td className="py-2.5">{statusBadge(aff.status)}</td>
                        <td className="py-2.5 text-right">{aff.leads_count}</td>
                        <td className="py-2.5 text-right">{aff.conversions_count}</td>
                        <td className="py-2.5 text-right">{aff.conversion_rate}%</td>
                        <td className="py-2.5 text-right font-medium">{formatFCFA(aff.total_earned)}</td>
                        <td className="py-2.5 text-right">{formatFCFA(aff.balance_available)}</td>
                        <td className="py-2.5 text-right">
                          {aff.avg_quality_score !== null ? (
                            <span className={`${aff.avg_quality_score >= 0.7 ? 'text-green-400' : aff.avg_quality_score >= 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {aff.avg_quality_score}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          {aff.fraud_flags > 0 ? (
                            <span className="text-red-400 font-medium">{aff.fraud_flags}</span>
                          ) : (
                            <span className="text-green-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {topAffiliates.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-dark-500">
                          Aucun affilié pour le moment
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Quick Actions */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Download className="w-4 h-4 text-primary-400" />
                Exports rapides
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { scope: 'summary', label: 'Ledger affiliés' },
                  { scope: 'leads', label: 'Leads anonymisés' },
                  { scope: 'commissions', label: 'Commissions' },
                  { scope: 'payouts', label: 'Payouts' },
                ].map(exp => (
                  <div key={exp.scope} className="flex items-center gap-1">
                    <button
                      onClick={() => handleExport(exp.scope, 'csv')}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" /> {exp.label} CSV
                    </button>
                    <button
                      onClick={() => handleExport(exp.scope, 'json')}
                      className="text-dark-400 hover:text-primary-400 transition-colors text-xs px-2 py-1.5"
                    >
                      JSON
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════ */}
        {/*   TAB: LEADS                            */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'leads' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary-400" />
                Leads anonymisés
              </h3>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-dark-400" />
                <select
                  value={leadsStatus}
                  onChange={e => { setLeadsStatus(e.target.value); setLeadsPage(1) }}
                  className="input-field py-1 px-2 text-xs w-auto"
                >
                  <option value="">Tous les statuts</option>
                  <option value="registered">Inscrit</option>
                  <option value="active">Actif</option>
                  <option value="subscribed">Abonné</option>
                  <option value="review">En review</option>
                  <option value="rejected">Rejeté</option>
                </select>
                <button onClick={() => handleExport('leads', 'csv')} className="text-dark-400 hover:text-white transition-colors" title="Exporter CSV">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-dark-400 text-left border-b border-dark-800">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Code affilié</th>
                    <th className="pb-2 font-medium">Statut</th>
                    <th className="pb-2 font-medium text-right">Qualité</th>
                    <th className="pb-2 font-medium text-center">Duplicat</th>
                    <th className="pb-2 font-medium">IP (hash)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/50">
                  {leads.map(lead => (
                    <tr key={lead.lead_id} className="text-dark-300 hover:bg-dark-800/30 transition-colors">
                      <td className="py-2.5 text-xs">
                        {new Date(lead.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 font-mono text-primary-400">{lead.affiliate_code}</td>
                      <td className="py-2.5">{statusBadge(lead.status)}</td>
                      <td className="py-2.5 text-right">
                        {lead.quality_score !== null ? (
                          <span className={`font-medium ${lead.quality_score >= 0.7 ? 'text-green-400' : lead.quality_score >= 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {lead.quality_score}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        {lead.is_duplicate ? <span className="text-red-400 font-medium">Oui</span> : <span className="text-dark-500">Non</span>}
                      </td>
                      <td className="py-2.5 font-mono text-dark-500">{lead.ip_hash_prefix || '—'}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-dark-500">Aucun lead trouvé</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-800">
              <div className="text-xs text-dark-500">
                Page {leadsPage} / {leadsTotalPages}
              </div>
              <div className="flex gap-1">
                <button
                  disabled={leadsPage <= 1}
                  onClick={() => setLeadsPage(p => p - 1)}
                  className="btn-secondary py-1 px-2 text-xs disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={leadsPage >= leadsTotalPages}
                  onClick={() => setLeadsPage(p => p + 1)}
                  className="btn-secondary py-1 px-2 text-xs disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/*   TAB: COMMISSIONS                      */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'commissions' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-400" />
                Ledger des commissions
              </h3>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-dark-400" />
                <select
                  value={commissionsStatus}
                  onChange={e => { setCommissionsStatus(e.target.value); setCommissionsPage(1) }}
                  className="input-field py-1 px-2 text-xs w-auto"
                >
                  <option value="">Tous les statuts</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="paid">Paid</option>
                  <option value="revoked">Revoked</option>
                </select>
                <button onClick={() => handleExport('commissions', 'csv')} className="text-dark-400 hover:text-white transition-colors" title="Exporter CSV">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-dark-400 text-left border-b border-dark-800">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Code affilié</th>
                    <th className="pb-2 font-medium">Plan</th>
                    <th className="pb-2 font-medium text-right">Montant</th>
                    <th className="pb-2 font-medium">Statut</th>
                    <th className="pb-2 font-medium">Confirmé</th>
                    <th className="pb-2 font-medium">Payé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/50">
                  {commissions.map(c => (
                    <tr key={c.commission_id} className="text-dark-300 hover:bg-dark-800/30 transition-colors">
                      <td className="py-2.5 text-xs">
                        {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-2.5 font-mono text-primary-400">{c.affiliate_code}</td>
                      <td className="py-2.5">
                        <span className="bg-dark-800 text-dark-300 px-1.5 py-0.5 rounded text-xs uppercase">{c.plan_type}</span>
                      </td>
                      <td className="py-2.5 text-right font-medium">{formatFCFA(c.amount)}</td>
                      <td className="py-2.5">{statusBadge(c.status)}</td>
                      <td className="py-2.5 text-xs text-dark-500">
                        {c.confirmed_at ? new Date(c.confirmed_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="py-2.5 text-xs text-dark-500">
                        {c.paid_at ? new Date(c.paid_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-dark-500">Aucune commission trouvée</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-800">
              <div className="text-xs text-dark-500">
                Page {commissionsPage} / {commissionsTotalPages}
              </div>
              <div className="flex gap-1">
                <button
                  disabled={commissionsPage <= 1}
                  onClick={() => setCommissionsPage(p => p - 1)}
                  className="btn-secondary py-1 px-2 text-xs disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={commissionsPage >= commissionsTotalPages}
                  onClick={() => setCommissionsPage(p => p + 1)}
                  className="btn-secondary py-1 px-2 text-xs disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/*   TAB: ALERTS                           */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`card p-4 border-l-4 ${
                  alert.triggered
                    ? alert.severity === 'critical'
                      ? 'border-l-red-500 bg-red-500/5'
                      : 'border-l-yellow-500 bg-yellow-500/5'
                    : 'border-l-dark-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {severityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{alert.message}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-dark-400">
                      <span>Règle : {alert.rule}</span>
                      <span>•</span>
                      <span>Valeur : {alert.value} / Seuil : {alert.threshold}</span>
                    </div>
                    {alert.details && (
                      <div className="mt-2 text-xs text-dark-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {alert.details}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    alert.triggered
                      ? alert.severity === 'critical'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-dark-700 text-dark-400'
                  }`}>
                    {alert.triggered ? 'Déclenché' : 'OK'}
                  </span>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="card text-center py-12 text-dark-500">
                Aucune règle d&apos;alerte configurée
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}

// ═══════════════ KPI CARD ═══════════════

function KPICard({
  label,
  value,
  total,
  suffix,
  icon: Icon,
  color,
  isCurrency,
}: {
  label: string
  value: number | string
  total?: number | string
  suffix?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  isCurrency?: boolean
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-dark-400 truncate">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>
        {typeof value === 'number' && !isCurrency ? value.toLocaleString('fr-FR') : value}
      </div>
      {total !== undefined && (
        <div className="text-xs text-dark-500 mt-1">
          Total : {typeof total === 'number' ? total.toLocaleString('fr-FR') : total}
          {suffix ? ` ${suffix}` : ''}
        </div>
      )}
    </div>
  )
}

