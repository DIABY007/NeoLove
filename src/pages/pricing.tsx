import { useRouter } from 'next/router'
import Head from 'next/head'
import { PLANS, WHATSAPP_AB_MESSAGES, APP_CONFIG } from '@/lib/constants'
import { ArrowLeft, Check, MessageCircle, Key } from 'lucide-react'

export default function PricingPage() {
  const router = useRouter()

  // Sélection aléatoire d'un message A/B Testing
  const handleBuyClick = (planName: string) => {
    const randomIndex = Math.floor(Math.random() * WHATSAPP_AB_MESSAGES.length)
    const variant = WHATSAPP_AB_MESSAGES[randomIndex]
    const message = encodeURIComponent(variant.template(planName))
    const phoneNumber = APP_CONFIG.adminWhatsAppNumber.replace('+', '')

    // Tracker la variante (optionnel)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('last_ab_variant', variant.variant)
      } catch {}
    }

    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank')
  }

  return (
    <>
      <Head>
        <title>Tarifs – NeoLove</title>
      </Head>
      <main className="min-h-screen max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Nos tarifs</h1>
            <p className="text-dark-400 text-sm">Choisissez le plan qui vous convient</p>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {PLANS.filter(plan => plan.showOnPricing).map((plan) => {
            const isPopular = plan.id === 'premium'

            return (
              <div
                key={plan.id}
                className={`card relative overflow-hidden ${
                  isPopular
                    ? 'border-primary-500/40 shadow-xl shadow-primary-500/5'
                    : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                    POPULAIRE
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-dark-400 text-sm">{plan.duration}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                      <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleBuyClick(plan.name)}
                  className={`w-full text-sm ${isPopular ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <span className="flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> Payer via WhatsApp</span>
                </button>
              </div>
            )
          })}
        </div>

        {/* Activation de code */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/profile')}
            className="btn-secondary w-full text-sm"
          >
            <span className="flex items-center justify-center gap-2"><Key className="w-4 h-4" /> J&apos;ai déjà un code d&apos;activation</span>
          </button>
        </div>

        {/* Note */}
        <div className="mt-8 text-center">
          <p className="text-dark-500 text-xs leading-relaxed">
            Le paiement se fait par Mobile Money.<br />
            Après paiement, vous recevez un code d&apos;activation<br />
            sur WhatsApp en quelques minutes.
          </p>
        </div>
      </main>
    </>
  )
}

