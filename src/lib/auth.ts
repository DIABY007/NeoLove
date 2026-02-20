import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from './supabase'
import type { User } from './types'

const JWT_SECRET = process.env.JWT_SECRET || 'neolove-dev-secret-key'
const COOKIE_NAME = 'neolove_session'

// ===== JWT =====

export function createSessionToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

// ===== COOKIES =====

export function setSessionCookie(res: NextApiResponse, token: string) {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: '/',
    })
  )
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  )
}

export function getSessionTokenFromRequest(req: NextApiRequest): string | null {
  const cookies = parse(req.headers.cookie || '')
  return cookies[COOKIE_NAME] || null
}

// ===== MIDDLEWARE AUTH =====

export async function getAuthenticatedUser(
  req: NextApiRequest
): Promise<User | null> {
  const token = getSessionTokenFromRequest(req)
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  const supabase = getServiceSupabase()

  // Vérifier que la session existe encore en BDD
  const { data: session } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('session_token', token)
    .single()

  if (!session) return null

  // Récupérer l'utilisateur
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .single()

  return user as User | null
}

// ===== HELPER : Vérifier licence active =====

export async function hasActiveLicense(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase()
  
  const { data } = await supabase
    .from('licenses')
    .select('id, expires_at, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .limit(1)

  return !!(data && data.length > 0)
}

// ===== HELPER : Créer session (et révoquer les anciennes) =====

export async function createSession(userId: string, res: NextApiResponse): Promise<string> {
  const supabase = getServiceSupabase()

  // Supprimer toutes les anciennes sessions pour ce user
  await supabase.from('sessions').delete().eq('user_id', userId)

  // Créer le token
  const token = createSessionToken(userId)

  // Stocker en BDD
  await supabase.from('sessions').insert({
    user_id: userId,
    session_token: token,
  })

  // Mettre le cookie
  setSessionCookie(res, token)

  return token
}

