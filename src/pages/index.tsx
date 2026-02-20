import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import NeoLoveLogo from '@/components/NeoLoveLogo'
import {
  Target,
  RefreshCw,
  Lightbulb,
  Search,
  MessageCircle,
  Heart,
  Zap,
  Palette,
  Mail,
  Sparkles,
  Send,
  User,
  Clipboard,
  Gift,
  Users,
  DollarSign,
  Share2,
  ArrowRight,
  Shield,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

// ===== DONNÉES =====

const BENEFITS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Target,
    title: 'Réponses pertinentes',
    description: 'Génère des réponses adaptées selon le ton et l\'objectif que tu choisis.',
  },
  {
    icon: RefreshCw,
    title: 'Relance intelligente',
    description: 'Aide à relancer une conversation qui s\'essouffle avec des idées fraîches.',
  },
  {
    icon: Lightbulb,
    title: 'Idées de sujets',
    description: 'Propose des sujets de conversation pour créer de la complicité naturellement.',
  },
  {
    icon: Search,
    title: 'Analyse des signaux',
    description: 'Détecte les signaux faibles : réponses courtes, délais, désintérêt…',
  },
]

const GAINS: { icon: LucideIcon; title: string; description: string; color: string; borderColor: string; iconBg: string; iconColor: string }[] = [
  {
    icon: MessageCircle,
    title: 'Moins de stress',
    description: 'Plus besoin de stresser pour savoir quoi répondre.',
    color: 'from-blue-500/20 to-blue-600/5',
    borderColor: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    icon: Lightbulb,
    title: 'Plus d\'idées',
    description: 'Garde la conversation vivante et intéressante.',
    color: 'from-amber-500/20 to-amber-600/5',
    borderColor: 'border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  {
    icon: Heart,
    title: 'Vraie connexion',
    description: 'Plus de chances de créer une vraie connexion.',
    color: 'from-rose-500/20 to-rose-600/5',
    borderColor: 'border-rose-500/20',
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
  },
  {
    icon: Zap,
    title: '3 secondes',
    description: 'Réponses prêtes en un éclair. Gain de temps garanti.',
    color: 'from-emerald-500/20 to-emerald-600/5',
    borderColor: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
]

const STEPS: { step: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    step: '01',
    title: 'Choisis ton ton',
    description: 'Taquin, romantique, sérieux… adapte ta vibe.',
    icon: Palette,
  },
  {
    step: '02',
    title: 'Colle le message reçu',
    description: 'Partage le message auquel tu veux répondre.',
    icon: Mail,
  },
  {
    step: '03',
    title: 'NeoLove génère',
    description: 'L\'IA te propose plusieurs réponses adaptées.',
    icon: Sparkles,
  },
  {
    step: '04',
    title: 'Copie & envoie',
    description: 'Choisis ta préférée, copie et envoie-la.',
    icon: Send,
  },
]

const TESTIMONIALS = [
  {
    quote: 'Grâce à NeoLove, j\'ai enfin décroché ce rendez-vous que je n\'osais pas proposer.',
    author: 'Moussa K.',
    detail: 'Utilisateur depuis 2 mois',
    initials: 'MK',
  },
  {
    quote: 'Je ne galère plus à relancer, le bot me propose toujours une phrase qui fait mouche.',
    author: 'Aminata D.',
    detail: 'Utilisatrice active',
    initials: 'AD',
  },
  {
    quote: 'C\'est comme avoir un coach personnel pour mes conversations. Je recommande à 100%.',
    author: 'Ibrahim S.',
    detail: 'Abonné premium',
    initials: 'IS',
  },
  {
    quote: 'J\'ai recommandé NeoLove à mes potes et je gagne des commissions. Tout le monde y gagne !',
    author: 'Fatou B.',
    detail: 'Partenaire NeoLove',
    initials: 'FB',
  },
]

const PARTNER_STEPS: { step: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    step: '1',
    title: 'Obtiens ton code',
    description: 'Inscris-toi et génère ton code partenaire unique en un clic.',
    icon: Gift,
  },
  {
    step: '2',
    title: 'Partage à tes amis',
    description: 'Envoie ton lien par WhatsApp, SMS ou réseaux sociaux.',
    icon: Share2,
  },
  {
    step: '3',
    title: 'Gagne des commissions',
    description: 'Touche jusqu\'à 4 000 FCFA pour chaque ami qui s\'abonne.',
    icon: DollarSign,
  },
]

const COMMISSION_TIERS = [
  { plan: 'Mensuel', price: '5 000 F', commission: '1 000 F', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20' },
  { plan: 'Trimestriel', price: '12 000 F', commission: '2 000 F', color: 'from-primary-500/20 to-primary-600/5', border: 'border-primary-500/30', popular: true },
  { plan: 'Semestriel', price: '20 000 F', commission: '4 000 F', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20' },
]

// ===== COMPOSANT DEMO =====

function DemoSection() {
  const [demoStep, setDemoStep] = useState(0)
  const [typedText, setTypedText] = useState('')
  const fullResponse = 'Je sens une grande créativité dans ce message… mais j\'ai envie de te laisser une deuxième chance ;)'

  useEffect(() => {
    if (demoStep === 1) {
      setTypedText('')
      let i = 0
      const interval = setInterval(() => {
        if (i < fullResponse.length) {
          setTypedText(fullResponse.slice(0, i + 1))
          i++
        } else {
          clearInterval(interval)
          setTimeout(() => setDemoStep(2), 500)
        }
      }, 25)
      return () => clearInterval(interval)
    }
  }, [demoStep])

  // Auto-play
  useEffect(() => {
    const timer = setTimeout(() => {
      if (demoStep === 0) setDemoStep(1)
    }, 1500)
    return () => clearTimeout(timer)
  }, [demoStep])

  // Loop
  useEffect(() => {
    if (demoStep === 2) {
      const timer = setTimeout(() => {
        setDemoStep(0)
        setTypedText('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [demoStep])

  return (
    <div className="relative max-w-sm mx-auto">
      {/* Phone mockup */}
      <div className="bg-dark-900 border border-dark-700 rounded-[2rem] p-1.5 shadow-2xl shadow-black/50">
        <div className="bg-dark-950 rounded-[1.6rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-2 text-[10px] text-dark-400">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-2 bg-dark-600 rounded-sm" />
              <div className="w-1 h-2 bg-dark-600 rounded-sm" />
            </div>
          </div>

          {/* Chat header */}
          <div className="px-4 py-2.5 bg-dark-900/50 border-b border-dark-800 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center overflow-hidden">
              <NeoLoveLogo size={28} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">NeoLove</div>
              <div className="text-[10px] text-primary-400 flex items-center gap-1">Ton : Taquin <Sparkles className="w-2.5 h-2.5" /></div>
            </div>
          </div>

          {/* Messages */}
          <div className="p-4 space-y-3 min-h-[220px]">
            {/* Message reçu */}
            <div className="flex justify-start">
              <div className="bg-dark-800 rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[85%]">
                <p className="text-xs text-dark-300 mb-1 font-medium">Message reçu</p>
                <p className="text-sm text-white">salut ça va ?</p>
              </div>
            </div>

            {/* Réponse générée */}
            {demoStep >= 1 && (
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30 rounded-2xl rounded-tr-md px-3.5 py-2.5 max-w-[85%]">
                  <p className="text-xs text-primary-400 mb-1 font-medium">Réponse NeoLove</p>
                  <p className="text-sm text-white">
                    {typedText}
                    {demoStep === 1 && <span className="inline-block w-0.5 h-4 bg-primary-400 ml-0.5 animate-pulse" />}
                  </p>
                </div>
              </div>
            )}

            {/* Bouton copier */}
            {demoStep === 2 && (
              <div className="flex justify-center pt-1">
                <div className="inline-flex items-center gap-1.5 bg-primary-500/20 text-primary-400 text-[11px] font-medium px-3 py-1.5 rounded-full animate-pulse">
                  <Clipboard className="w-3 h-3" /> Copier la réponse
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-4 bg-primary-500/10 rounded-[3rem] blur-2xl -z-10" />
    </div>
  )
}

// ===== PAGE PRINCIPALE =====

export default function Home() {
  const router = useRouter()

  // Capturer le code affilié et le stocker pour la page auth
  useEffect(() => {
    const ref = router.query.ref
    if (typeof ref === 'string' && ref.trim()) {
      sessionStorage.setItem('neolove_ref', ref.trim())
    }
  }, [router.query.ref])

  return (
    <>
      <Head>
        <title>NeoLove – Assistant Relationnel Intelligent</title>
        <meta name="description" content="NeoLove génère des réponses parfaites pour vos conversations. Choisissez votre ton, collez le message, et obtenez des réponses qui marquent en 3 secondes." />
      </Head>

      <div className="min-h-screen">
        {/* ========== HERO ========== */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary-700/5 rounded-full blur-[80px]" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            <span className="text-primary-400 text-xs font-medium">Disponible maintenant</span>
          </div>

          {/* Logo */}
          <div className="mb-6 rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/20">
            <NeoLoveLogo size={80} />
          </div>

          {/* Titre */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-center leading-tight mb-4">
            <span className="bg-gradient-to-r from-white via-white to-dark-300 bg-clip-text text-transparent">
              Ne sèche plus
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              jamais sur un message.
            </span>
          </h1>

          {/* Sous-titre */}
          <p className="text-dark-400 text-lg sm:text-xl text-center max-w-md mx-auto mb-8 leading-relaxed">
            NeoLove génère la réponse parfaite en{' '}
            <span className="text-white font-semibold">3 secondes</span>. Choisis ton ton, et laisse l&apos;IA faire le reste.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <a href="/auth" className="btn-primary w-full text-center text-lg py-4 shadow-xl shadow-primary-500/30">
              Commencer gratuitement
            </a>
            <p className="text-dark-500 text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
              </svg>
              Inscription rapide via WhatsApp · 3 jours d&apos;essai gratuit
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 animate-bounce">
            <svg className="w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </section>

        {/* ========== SOCIAL PROOF STRIP ========== */}
        <section className="py-10 px-4 relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-dark-950 via-primary-500/[0.02] to-dark-950" />
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-primary-500/10 mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-primary-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">500+</div>
                <div className="text-xs text-dark-400 mt-0.5">Utilisateurs actifs</div>
              </div>
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/10 mb-2 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">10K+</div>
                <div className="text-xs text-dark-400 mt-0.5">Réponses générées</div>
              </div>
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/10 mb-2 group-hover:scale-110 transition-transform">
                  <Heart className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">95%</div>
                <div className="text-xs text-dark-400 mt-0.5">Taux de satisfaction</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CE QUE NEOLOVE FAIT POUR VOUS ========== */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block text-primary-400 text-sm font-semibold tracking-wider uppercase mb-3">Fonctionnalités</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ce que NeoLove fait pour vous
              </h2>
              <p className="text-dark-400 max-w-lg mx-auto">
                Un assistant qui comprend vos conversations et vous aide à chaque étape.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BENEFITS.map((benefit, i) => (
                <div
                  key={i}
                  className="group glass-card hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300 w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1.5">{benefit.title}</h3>
                      <p className="text-sm text-dark-400 leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== CE QUE VOUS Y GAGNEZ ========== */}
        <section className="py-20 px-4 relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary-500/[0.03] to-transparent" />
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block text-primary-400 text-sm font-semibold tracking-wider uppercase mb-3">Bénéfices</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ce que vous y gagnez
              </h2>
              <p className="text-dark-400 max-w-lg mx-auto">
                Chaque conversation devient une opportunité de connexion.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {GAINS.map((gain, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-3xl border ${gain.borderColor} bg-gradient-to-br ${gain.color} p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02]`}
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl ${gain.iconBg} mb-3`}>
                    <gain.icon className={`w-5 h-5 ${gain.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{gain.title}</h3>
                  <p className="text-xs sm:text-sm text-dark-400 leading-relaxed">{gain.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== MINI DEMO ========== */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block text-primary-400 text-sm font-semibold tracking-wider uppercase mb-3">Démo en direct</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Voyez NeoLove en action
              </h2>
              <p className="text-dark-400 max-w-lg mx-auto">
                Un message banal ? NeoLove le transforme en opportunité.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Phone demo */}
              <div className="order-1 md:order-1">
                <DemoSection />
              </div>

              {/* Explanation */}
              <div className="order-2 md:order-2 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-sm font-bold text-dark-400 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Elle envoie &quot;salut ça va ?&quot;</h4>
                    <p className="text-sm text-dark-400">Un message classique. Difficile d&apos;y répondre de manière originale.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm font-bold text-primary-400 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">NeoLove analyse et propose</h4>
                    <p className="text-sm text-dark-400">L&apos;IA génère une réponse taquine qui marque les esprits.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-sm font-bold text-dark-400 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Tu copies et tu envoies</h4>
                    <p className="text-sm text-dark-400">Un tap, c&apos;est copié. La conversation décolle.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== COMMENT ÇA MARCHE ========== */}
        <section className="py-20 px-4 relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary-500/[0.03] to-transparent" />
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block text-primary-400 text-sm font-semibold tracking-wider uppercase mb-3">En 4 étapes</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Comment ça marche
              </h2>
              <p className="text-dark-400 max-w-lg mx-auto">
                Simple, rapide, efficace. En moins de 30 secondes, tu as ta réponse.
              </p>
            </div>

            <div className="relative">
              {/* Connecting line */}
              <div className="hidden sm:block absolute top-12 left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px bg-gradient-to-r from-primary-500/30 via-primary-500/50 to-primary-500/30" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {STEPS.map((step, i) => (
                  <div key={i} className="text-center group">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 mb-4 group-hover:border-primary-500/50 group-hover:bg-primary-500/10 transition-all duration-300">
                      <step.icon className="w-6 h-6 text-primary-400" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-primary-500/30">
                        {step.step.replace('0', '')}
                      </div>
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1">{step.title}</h4>
                    <p className="text-xs text-dark-400 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========== TÉMOIGNAGES ========== */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block text-primary-400 text-sm font-semibold tracking-wider uppercase mb-3">Témoignages</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ils utilisent NeoLove
              </h2>
              <p className="text-dark-400 max-w-lg mx-auto">
                Découvrez ce que nos utilisateurs en pensent.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="glass-card hover:border-primary-500/20 transition-all duration-300"
                >
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-sm text-dark-300 leading-relaxed mb-4 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.author}</p>
                      <p className="text-[11px] text-dark-500">{t.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== PROGRAMME PARTENAIRE ========== */}
        <section className="py-20 px-4 relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent" />
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm font-semibold tracking-wider uppercase mb-3">
                <Gift className="w-4 h-4" /> Programme partenaire
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Recommande NeoLove,<br />
                <span className="bg-gradient-to-r from-emerald-400 to-primary-400 bg-clip-text text-transparent">gagne des commissions</span>
              </h2>
              <p className="text-dark-400 max-w-lg mx-auto">
                Partage NeoLove avec tes proches et touche une commission sur chaque abonnement.
                Simple, transparent, sécurisé.
              </p>
            </div>

            {/* 3 étapes partenaire */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {PARTNER_STEPS.map((step, i) => (
                <div key={i} className="relative text-center group">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 mb-4 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300">
                    <step.icon className="w-6 h-6 text-emerald-400" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      {step.step}
                    </div>
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-dark-400 leading-relaxed">{step.description}</p>
                  {/* Flèche entre les étapes (desktop) */}
                  {i < PARTNER_STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-7 -right-2 text-dark-600">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Grille des commissions */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {COMMISSION_TIERS.map((tier, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-2xl border ${tier.border} bg-gradient-to-br ${tier.color} p-4 text-center transition-all duration-300 hover:scale-[1.03]`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0 bg-primary-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                      TOP
                    </div>
                  )}
                  <div className="text-xs text-dark-400 mb-1">{tier.plan}</div>
                  <div className="text-[10px] text-dark-500 mb-2">Abonnement {tier.price}</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">{tier.commission}</div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-1">ta commission</div>
                </div>
              ))}
            </div>

            {/* CTA partenaire */}
            <div className="text-center">
              <a
                href="/auth"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all duration-200"
              >
                <Gift className="w-5 h-5" />
                Devenir partenaire
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-dark-500 text-xs mt-3 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Commission versée après chaque abonnement validé · Tableau de bord dédié
              </p>
            </div>
          </div>
        </section>

        {/* ========== CTA FINAL ========== */}
        <section className="py-20 px-4 relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px]" />
          </div>

          <div className="max-w-lg mx-auto text-center">
            <div className="mb-6 rounded-3xl overflow-hidden inline-block shadow-2xl shadow-primary-500/20">
              <NeoLoveLogo size={56} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Prêt à ne plus jamais sécher ?
            </h2>
            <p className="text-dark-400 mb-8 text-lg">
              Rejoins NeoLove et transforme chaque message en opportunité.
              <br />
              <span className="text-primary-400 font-medium">3 jours d&apos;essai gratuit.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
              <a href="/auth" className="btn-primary text-lg px-8 py-4 shadow-xl shadow-primary-500/30 w-full sm:w-auto">
                Commencer maintenant
              </a>
              <a href="/auth" className="inline-flex items-center gap-2 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium rounded-2xl hover:bg-emerald-500/20 transition-all text-sm w-full sm:w-auto justify-center">
                <Gift className="w-4 h-4" />
                Devenir partenaire
              </a>
            </div>

            <p className="text-dark-500 text-xs mt-4">
              Pas de carte bancaire · Inscription en 30 secondes via WhatsApp
            </p>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="py-8 px-4 border-t border-dark-800">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl overflow-hidden">
                <NeoLoveLogo size={24} />
              </div>
              <span className="text-sm font-semibold text-dark-400">NeoLove</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-dark-500">
              <a href="/pricing" className="hover:text-white transition-colors">Tarifs</a>
              <a href="/auth" className="hover:text-white transition-colors">Connexion</a>
              <a href="/auth" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                <Gift className="w-3 h-3" /> Partenaire
              </a>
            </div>
            <p className="text-dark-600 text-xs">
              © 2026 NeoLove. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
