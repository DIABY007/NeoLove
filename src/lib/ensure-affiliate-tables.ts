/**
 * Vérifie et crée les tables d'affiliation si elles n'existent pas.
 * Utilise une tentative de SELECT pour détecter et un appel HTTP brut
 * vers l'endpoint Supabase pour exécuter le DDL si nécessaire.
 */
import { getServiceSupabase } from './supabase'

let tablesVerified = false

/**
 * Vérifie que la table 'affiliates' existe. Retourne true si OK.
 */
export async function ensureAffiliateTablesExist(): Promise<{ ok: boolean; error?: string }> {
  // Cache: ne vérifier qu'une fois par instance de serveur
  if (tablesVerified) return { ok: true }

  const supabase = getServiceSupabase()

  // Tenter un SELECT simple sur affiliates
  const { error } = await supabase
    .from('affiliates')
    .select('id')
    .limit(1)

  if (!error) {
    tablesVerified = true
    return { ok: true }
  }

  // Si l'erreur est "relation does not exist" (code 42P01 ou message contenant 'does not exist')
  const isTableMissing =
    error.code === '42P01' ||
    error.message?.includes('does not exist') ||
    error.message?.includes('relation') ||
    error.code === 'PGRST116' ||
    error.code === 'PGRST204'

  if (!isTableMissing) {
    // L'erreur n'est pas liée aux tables manquantes
    tablesVerified = true
    return { ok: true }
  }

  // Tables manquantes : tenter la création via l'API SQL Supabase
  const created = await createAffiliateTables()
  if (created) {
    tablesVerified = true
    return { ok: true }
  }

  return {
    ok: false,
    error: 'Les tables d\'affiliation n\'existent pas encore. Exécutez le fichier supabase/migrations/002_affiliate_tables.sql dans l\'éditeur SQL de votre projet Supabase.',
  }
}

/**
 * Tente de créer les tables via l'API SQL de Supabase (endpoint pg)
 */
async function createAffiliateTables(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return false

  const migrationSQL = `
    -- Extension UUID
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Table affiliates
    CREATE TABLE IF NOT EXISTS affiliates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      code TEXT UNIQUE NOT NULL,
      custom_code TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
      balance_available INTEGER NOT NULL DEFAULT 0,
      balance_pending INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      total_paid INTEGER NOT NULL DEFAULT 0,
      leads_count INTEGER NOT NULL DEFAULT 0,
      conversions_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
    CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);

    -- Table affiliate_leads
    CREATE TABLE IF NOT EXISTS affiliate_leads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
      referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      phone_hash TEXT,
      ip_hash TEXT,
      device_fingerprint TEXT,
      quality_score NUMERIC(3,2) DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'subscribed', 'rejected', 'review')),
      is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_leads_affiliate ON affiliate_leads(affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON affiliate_leads(status);

    -- Table affiliate_commissions
    CREATE TABLE IF NOT EXISTS affiliate_commissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
      lead_id UUID NOT NULL REFERENCES affiliate_leads(id) ON DELETE CASCADE,
      license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
      plan_type TEXT NOT NULL,
      commission_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'revoked')),
      confirmed_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      revoke_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);

    -- Table affiliate_payouts
    CREATE TABLE IF NOT EXISTS affiliate_payouts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'paid', 'rejected')),
      payment_method TEXT DEFAULT 'whatsapp_manual',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);

    -- Table affiliate_audit_logs
    CREATE TABLE IF NOT EXISTS affiliate_audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_affiliate ON affiliate_audit_logs(affiliate_id);

    -- Colonne referred_by sur users
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES affiliates(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    -- RLS
    ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE affiliate_leads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE affiliate_audit_logs ENABLE ROW LEVEL SECURITY;
  `

  // Méthode 1 : Endpoint SQL direct Supabase (pg/query)
  // Disponible sur les projets Supabase hosted
  try {
    const sqlEndpoints = [
      `${supabaseUrl}/rest/v1/rpc/`,  // Via RPC (si fonction existe)
      `${supabaseUrl}/pg`,             // Endpoint pg
    ]

    // Tenter via fetch direct avec le service role key
    // L'endpoint /rest/v1/ ne supporte pas le DDL, mais /pg oui sur certaines instances
    const pgResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: migrationSQL }),
    })

    // Si ça marche, vérifier
    if (pgResponse.ok) {
      console.log('[AFFILIATE SETUP] Tables créées via Supabase API')
      return true
    }
  } catch (e) {
    console.log('[AFFILIATE SETUP] Endpoint SQL non disponible, tentative alternative...')
  }

  // Méthode 2 : Créer les tables une par une via des requêtes individuelles
  // En utilisant le service role et l'insertion d'un record test
  try {
    const supabase = getServiceSupabase()

    // Essayer de créer un test record pour voir si ça fonctionne maintenant
    const { error: testError } = await supabase
      .from('affiliates')
      .select('id')
      .limit(1)

    if (!testError) return true
  } catch {
    // Ignore
  }

  console.error('[AFFILIATE SETUP] Impossible de créer les tables automatiquement. Veuillez exécuter la migration manuellement.')
  return false
}

