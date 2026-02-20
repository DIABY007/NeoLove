// ===== TONS DISPONIBLES (alignés sur la base de connaissances) =====
export const TONES = [
  { id: 'neutre', label: 'Neutre', icon: 'Meh', description: 'Équilibré et posé' },
  { id: 'taquin', label: 'Taquin', icon: 'SmilePlus', description: 'Joueur et provocateur' },
  { id: 'sérieux', label: 'Sérieux', icon: 'Glasses', description: 'Mature et réfléchi' },
  { id: 'romantique', label: 'Romantique', icon: 'Heart', description: 'Doux et attentionné' },
  { id: 'joueur', label: 'Joueur', icon: 'Laugh', description: 'Fun et décontracté' },
  { id: 'empathique', label: 'Empathique', icon: 'HeartHandshake', description: 'Compréhensif et bienveillant' },
] as const

export type ToneId = typeof TONES[number]['id']

// ===== PLANS DE LICENCE =====
export const PLANS = [
  {
    id: 'trial',
    name: 'Essai',
    price: 'Gratuit',
    duration: '3 jours',
    features: ['Générations illimitées', 'Tous les tons', 'Support WhatsApp'],
    durationDays: 3,
    showOnPricing: false, // Accordé automatiquement à l'inscription
  },
  {
    id: 'standard',
    name: 'Mensuel',
    price: '5 000 FCFA',
    duration: '1 mois',
    features: ['Générations illimitées', 'Tous les tons', 'Support WhatsApp'],
    durationDays: 30,
    showOnPricing: true,
  },
  {
    id: 'premium',
    name: 'Trimestriel',
    price: '12 000 FCFA',
    duration: '3 mois',
    features: ['Générations illimitées', 'Tous les tons', 'Support WhatsApp'],
    durationDays: 90,
    showOnPricing: true,
  },
  {
    id: 'vip',
    name: 'Semestriel',
    price: '20 000 FCFA',
    duration: '6 mois',
    features: ['Générations illimitées', 'Tous les tons', 'Support WhatsApp'],
    durationDays: 180,
    showOnPricing: true,
  },
] as const

export type PlanType = 'trial' | 'standard' | 'premium' | 'vip'

// ===== CONFIG APP =====
export const APP_CONFIG = {
  name: 'NeoLove',
  maxInputLength: 500,
  maxContextLength: 300,
  rateLimitPerMinute: 5,
  otpLength: 6,
  otpExpiryMinutes: 5,
  adminWhatsAppNumber: '+22656636039',
}

// ===== MESSAGES A/B TESTING WHATSAPP =====
export const WHATSAPP_AB_MESSAGES = [
  {
    variant: 'A',
    template: (plan: string) =>
      `Bonjour, je souhaite souscrire au plan ${plan}. Merci de m'envoyer les instructions de paiement par Mobile Money.`,
  },
  {
    variant: 'B',
    template: (plan: string) =>
      `Salut ! J'aimerais activer le forfait ${plan} sur mon compte. Comment je procède pour le paiement ?`,
  },
  {
    variant: 'C',
    template: (plan: string) =>
      `Hello, je suis prêt(e) à prendre l'abonnement ${plan}. Pouvez-vous m'indiquer la marche à suivre pour payer ?`,
  },
]

