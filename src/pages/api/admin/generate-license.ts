import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'
import crypto from 'crypto'

const GenerateLicenseSchema = z.object({
  plan_type: z.enum(['trial', 'standard', 'premium', 'vip']),
  count: z.number().min(1).max(50).optional().default(1),
})

function generateLicenseCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sans I, O, 1, 0 pour éviter la confusion
  let code = 'NEO-'
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(chars.length)]
    if (i === 3) code += '-'
  }
  return code
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  // Vérifier que c'est un admin
  const user = await getAuthenticatedUser(req)
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès refusé' })
  }

  const validation = GenerateLicenseSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.errors[0]?.message || 'Données invalides',
    })
  }

  const { plan_type, count } = validation.data
  const supabase = getServiceSupabase()

  try {
    const codes: string[] = []
    
    for (let i = 0; i < count; i++) {
      const code = generateLicenseCode()
      codes.push(code)
    }

    const { data, error: insertError } = await supabase
      .from('licenses')
      .insert(
        codes.map(code => ({
          code,
          plan_type,
          status: 'unused',
          created_by: user.id,
        }))
      )
      .select('code, plan_type')

    if (insertError) {
      console.error('[ADMIN] Erreur création licence:', insertError)
      
      // Erreur de contrainte CHECK sur plan_type
      if (insertError.code === '23514' && insertError.message?.includes('plan_type')) {
        return res.status(400).json({
          success: false,
          error: `Le plan "${plan_type}" n'est pas encore supporté en base. Exécutez la migration SQL dans Supabase.`,
        })
      }

      return res.status(500).json({ success: false, error: `Erreur lors de la création: ${insertError.message}` })
    }

    return res.status(200).json({
      success: true,
      data: { codes: data, count: codes.length },
    })
  } catch (error) {
    console.error('[ADMIN] Erreur:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}

