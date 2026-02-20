import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import NeoLoveLogo from '@/components/NeoLoveLogo'
import { Globe, ArrowLeft, Gift } from 'lucide-react'

type Step = 'phone' | 'otp'

export default function AuthPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [name, setName] = useState('')
  const [localNumber, setLocalNumber] = useState('')
  const phoneNumber = `+226${localNumber}`
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpFallback, setOtpFallback] = useState('')
  const [whatsappSent, setWhatsappSent] = useState(true)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Capturer le code affilié depuis l'URL (?ref=NEO-XXXX) ou sessionStorage
  const [refCode, setRefCode] = useState('')
  const [showRefField, setShowRefField] = useState(false)
  useEffect(() => {
    const fromUrl = typeof router.query.ref === 'string' ? router.query.ref : ''
    const fromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('neolove_ref') || '' : ''
    const code = fromUrl || fromStorage
    if (code) {
      setRefCode(code)
      setShowRefField(true)
      sessionStorage.setItem('neolove_ref', code)
    }
  }, [router.query.ref])

  // ===== Envoi OTP =====
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOtpFallback('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, name }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Erreur lors de l\'envoi')
        return
      }

      // Vérifier si le WhatsApp a bien été envoyé
      setWhatsappSent(data.data?.whatsapp_sent !== false)

      // Si WhatsApp a échoué, afficher le code en fallback
      if (data.data?.otp_fallback) {
        setOtpFallback(data.data.otp_fallback)
      }

      // Persister le code de parrainage
      if (refCode) {
        sessionStorage.setItem('neolove_ref', refCode)
      }

      setStep('otp')
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // ===== Vérification OTP =====
  const handleVerifyOTP = async (otpOverride?: string) => {
    const otpCode = otpOverride || otp.join('')
    if (otpCode.length !== 6) return

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, otp: otpCode, name, affiliate_code: refCode || undefined }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Code invalide')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
        return
      }

      // Nettoyer le code de parrainage utilisé
      sessionStorage.removeItem('neolove_ref')

      // Rediriger vers le chat ou le profil
      if (data.data?.hasActiveLicense) {
        router.push('/chat')
      } else {
        router.push('/profile')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // ===== Gestion des inputs OTP =====
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus suivant
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit si complet — passer le code directement pour éviter le stale closure
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      const completeCode = newOtp.join('')
      setTimeout(() => handleVerifyOTP(completeCode), 200)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Auto-focus premier input OTP
  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus()
    }
  }, [step])

  return (
    <>
      <Head>
        <title>Connexion – NeoLove</title>
      </Head>
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30 rounded-2xl overflow-hidden">
            <NeoLoveLogo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {step === 'phone' ? 'Bienvenue sur NeoLove' : 'Vérification'}
          </h1>
          <p className="text-dark-400 mt-2 text-sm">
            {step === 'phone'
              ? 'Entrez vos informations pour commencer'
              : whatsappSent
                ? `Code envoyé sur WhatsApp au ${phoneNumber}`
                : 'Entrez le code affiché ci-dessous'}
          </p>
        </div>

        {/* Formulaire */}
        <div className="w-full max-w-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Votre prénom</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Amadou"
                  className="input-field"
                  required
                  minLength={2}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-2">Numéro WhatsApp</label>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center gap-1.5 h-[48px] px-3 bg-dark-700 border border-dark-600 rounded-2xl text-white text-sm font-semibold select-none shrink-0">
                    <Globe className="w-4 h-4 text-primary-400" /> +226
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={localNumber}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setLocalNumber(val)
                    }}
                    placeholder="XX XX XX XX"
                    className="input-field flex-1"
                    required
                    maxLength={8}
                  />
                </div>
                <p className={`text-xs mt-1.5 text-right font-medium transition-colors ${localNumber.length === 8 ? 'text-green-400' : 'text-dark-400'}`}>
                  {localNumber.length}/8 chiffres
                </p>
              </div>

              {/* Champ code de parrainage (facultatif) */}
              {!showRefField ? (
                <button
                  type="button"
                  onClick={() => setShowRefField(true)}
                  className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors w-full justify-center"
                >
                  <Gift className="w-4 h-4" />
                  J&apos;ai un code de parrainage
                </button>
              ) : (
                <div>
                  <label className="block text-sm text-dark-300 mb-2">
                    Code de parrainage <span className="text-dark-500">(facultatif)</span>
                  </label>
                  <input
                    type="text"
                    value={refCode}
                    onChange={e => setRefCode(e.target.value.toUpperCase().trim())}
                    placeholder="Ex: NEO-XXXX"
                    className="input-field"
                    maxLength={20}
                  />
                  {refCode && (
                    <p className="text-xs mt-1.5 text-primary-400 flex items-center gap-1">
                      <Gift className="w-3 h-3" /> Code {refCode} sera appliqué
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name || localNumber.length !== 8}
                className="btn-primary w-full mt-6"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi en cours...
                  </span>
                ) : (
                  'Recevoir le code'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Fallback: afficher le code si WhatsApp a échoué */}
              {otpFallback && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-center">
                  <p className="text-yellow-400 text-xs mb-2">
                    ⚠️ Le message WhatsApp n&apos;a pas pu être envoyé
                  </p>
                  <p className="text-white text-2xl font-bold tracking-[0.3em]">
                    {otpFallback}
                  </p>
                  <p className="text-dark-400 text-xs mt-2">
                    Entrez ce code ci-dessous pour continuer
                  </p>
                </div>
              )}

              {/* OTP Inputs */}
              <div className="flex justify-center gap-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-dark-800 border border-dark-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                ))}
              </div>

              <button
                onClick={() => handleVerifyOTP()}
                disabled={loading || otp.join('').length !== 6}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Vérification...
                  </span>
                ) : (
                  'Vérifier le code'
                )}
              </button>

              <button
                onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); setOtpFallback('') }}
                className="text-dark-400 text-sm w-full text-center hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Changer de numéro
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
