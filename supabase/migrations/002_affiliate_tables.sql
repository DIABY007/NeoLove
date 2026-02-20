-- ============================================================
-- NeoLove — Migration 002 : Programme d'affiliation
-- Tables : affiliates, affiliate_leads, affiliate_commissions,
--          affiliate_payouts, affiliate_audit_logs
-- ============================================================

-- ===== TABLE AFFILIATES (comptes partenaires) =====
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,              -- ex: NEO-AB12
  custom_code TEXT UNIQUE,                -- code personnalisé optionnel
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  balance_available INTEGER NOT NULL DEFAULT 0,   -- solde disponible en FCFA (entier)
  balance_pending INTEGER NOT NULL DEFAULT 0,     -- solde en attente de validation
  total_earned INTEGER NOT NULL DEFAULT 0,        -- total gagné historique
  total_paid INTEGER NOT NULL DEFAULT 0,          -- total payé
  leads_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_custom_code ON affiliates(custom_code);

-- ===== TABLE AFFILIATE_LEADS (inscriptions via code affilié) =====
CREATE TABLE IF NOT EXISTS affiliate_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  phone_hash TEXT,                        -- hash du numéro pour déduplication (pas le numéro en clair)
  ip_hash TEXT,                           -- hash IP pour anti-fraude
  device_fingerprint TEXT,                -- fingerprint device
  quality_score NUMERIC(3,2) DEFAULT 0.5, -- 0.0 à 1.0
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'subscribed', 'rejected', 'review')),
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_affiliate ON affiliate_leads(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON affiliate_leads(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone_hash ON affiliate_leads(phone_hash);
CREATE INDEX IF NOT EXISTS idx_leads_status ON affiliate_leads(status);

-- ===== TABLE AFFILIATE_COMMISSIONS (commissions par transaction) =====
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES affiliate_leads(id) ON DELETE CASCADE,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL,                 -- standard/premium/vip
  commission_amount INTEGER NOT NULL,      -- 1000/2000/4000 FCFA
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'revoked')),
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_lead ON affiliate_commissions(lead_id);

-- ===== TABLE AFFILIATE_PAYOUTS (demandes de paiement) =====
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
CREATE INDEX IF NOT EXISTS idx_payouts_status ON affiliate_payouts(status);

-- ===== TABLE AFFILIATE_AUDIT_LOGS (immutable audit trail) =====
CREATE TABLE IF NOT EXISTS affiliate_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  action TEXT NOT NULL,                    -- code_generated, lead_registered, commission_attributed, commission_revoked, payout_requested, etc.
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_affiliate ON affiliate_audit_logs(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON affiliate_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON affiliate_audit_logs(created_at);

-- ===== Ajouter colonne referred_by sur users pour traçabilité =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES affiliates(id) ON DELETE SET NULL;

-- ===== RLS =====
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_audit_logs ENABLE ROW LEVEL SECURITY;

-- Cleanup : logs d'audit > 12 mois (via cron Supabase)
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 1 * *', $$
--   DELETE FROM affiliate_audit_logs WHERE created_at < NOW() - INTERVAL '12 months';
-- $$);

