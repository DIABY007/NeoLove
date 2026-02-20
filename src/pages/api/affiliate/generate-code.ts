import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { generateAffiliateCode, logAuditEvent } from '@/lib/affiliate-engine'
import { sendWhatsAppMessage } from '@/lib/wasender'
import { ensureAffiliateTablesExist } from '@/lib/ensure-affiliate-tables'
import type { ApiResponse } from '@/lib/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' })
  }

  const user = await getAuthenticatedUser(req)
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non authentifié' })
  }

  // S'assurer que les tables d'affiliation existent
  const tablesCheck = await ensureAffiliateTablesExist()
  if (!tablesCheck.ok) {
    console.error('[AFFILIATE] Tables manquantes:', tablesCheck.error)
    return res.status(500).json({
      success: false,
      error: tablesCheck.error || 'Tables d\'affiliation non disponibles. Contactez l\'administrateur.',
    })
  }

  const supabase = getServiceSupabase()

  try {
    // Vérifier si l'utilisateur est déjà affilié
    const { data: existing, error: selectError } = await supabase
      .from('affiliates')
      .select('id, code, custom_code, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (selectError) {
      console.error('[AFFILIATE] Erreur SELECT affiliates:', selectError)
      return res.status(500).json({
        success: false,
        error: `Erreur base de données : ${selectError.message} (code: ${selectError.code})`,
      })
    }

    if (existing) {
      const existingCode = existing.custom_code || existing.code
      // Renvoyer aussi le code par WhatsApp à chaque fois
      await sendAffiliateCodeWhatsApp(user.phone_number, existingCode)
      return res.status(200).json({
        success: true,
        data: {
          affiliate_id: existing.id,
          code: existingCode,
          is_new: false,
          whatsapp_sent: true,
        },
      })
    }

    // Générer un nouveau code unique (avec retries en cas de collision)
    let code = ''
    let attempts = 0
    while (attempts < 10) {
      code = generateAffiliateCode()
      const { data: codeExists } = await supabase
        .from('affiliates')
        .select('id')
        .eq('code', code)
        .maybeSingle()

      if (!codeExists) break
      attempts++
    }

    if (!code) {
      return res.status(500).json({ success: false, error: 'Impossible de générer un code unique' })
    }

    // Créer le compte affilié
    const { data: affiliate, error: insertError } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        code,
        status: 'active',
      })
      .select('id, code')
      .single()

    if (insertError || !affiliate) {
      console.error('[AFFILIATE] Erreur création:', insertError)

      // Erreur de contrainte unique (user_id déjà affilié - race condition)
      if (insertError?.code === '23505') {
        // Re-fetch l'existant
        const { data: reFetch } = await supabase
          .from('affiliates')
          .select('id, code, custom_code')
          .eq('user_id', user.id)
          .single()

        if (reFetch) {
          const reFetchCode = reFetch.custom_code || reFetch.code
          await sendAffiliateCodeWhatsApp(user.phone_number, reFetchCode)
          return res.status(200).json({
            success: true,
            data: {
              affiliate_id: reFetch.id,
              code: reFetchCode,
              is_new: false,
              whatsapp_sent: true,
            },
          })
        }
      }

      // Erreur de table manquante
      if (insertError?.code === '42P01' || insertError?.message?.includes('does not exist')) {
        return res.status(500).json({
          success: false,
          error: 'Les tables d\'affiliation ne sont pas encore créées. Veuillez exécuter la migration SQL (fichier 002_affiliate_tables.sql) dans l\'éditeur SQL de Supabase.',
        })
      }

      return res.status(500).json({
        success: false,
        error: `Erreur lors de la création : ${insertError?.message || 'Erreur inconnue'} (code: ${insertError?.code || '?'})`,
      })
    }

    // Envoyer le code par WhatsApp
    const whatsappSent = await sendAffiliateCodeWhatsApp(user.phone_number, affiliate.code)

    // Audit log
    try {
      await logAuditEvent(affiliate.id, 'code_generated', {
        code: affiliate.code,
        user_id: user.id,
        whatsapp_sent: whatsappSent,
      })
    } catch (auditErr) {
      // Ne pas bloquer si l'audit échoue
      console.error('[AFFILIATE] Erreur audit:', auditErr)
    }

    return res.status(200).json({
      success: true,
      data: {
        affiliate_id: affiliate.id,
        code: affiliate.code,
        is_new: true,
        whatsapp_sent: whatsappSent,
      },
    })
  } catch (error) {
    console.error('[AFFILIATE] Erreur inattendue:', error)
    return res.status(500).json({
      success: false,
      error: `Erreur serveur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    })
  }
}

/**
 * Envoyer le code partenaire par WhatsApp à l'utilisateur
 */
async function sendAffiliateCodeWhatsApp(phoneNumber: string, code: string): Promise<boolean> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://neolove.app'
    const link = `${appUrl}/?ref=${code}`

    const message =
      `🎉 *NeoLove — Ton code partenaire*\n\n` +
      `Ton code : *${code}*\n` +
      `Ton lien : ${link}\n\n` +
      `📤 Partage ce lien avec tes amis et gagne des commissions sur chaque abonnement :\n` +
      `• 1 000 F par abonnement mensuel\n` +
      `• 2 000 F par abonnement trimestriel\n` +
      `• 4 000 F par abonnement semestriel\n\n` +
      `Ton tableau de bord est accessible depuis ton profil. Bonne chance ! 🚀`

    const result = await sendWhatsAppMessage(phoneNumber, message)
    if (!result.success) {
      console.error('[AFFILIATE] Erreur envoi WhatsApp:', result.error)
    }
    return result.success
  } catch (err) {
    console.error('[AFFILIATE] Erreur envoi WhatsApp:', err)
    return false
  }
}
