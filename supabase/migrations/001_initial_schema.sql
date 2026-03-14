-- ============================================================
-- NotMyRecruiter — Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE submission_status AS ENUM (
  'pending',
  'published',
  'under_review',
  'removed'
);

CREATE TYPE dispute_tier AS ENUM (
  'tier_1',  -- Self-attestation (email domain match)
  'tier_2'   -- Verified LinkedIn match
);

CREATE TYPE dispute_status AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

-- ============================================================
-- COMPANIES
-- ============================================================

CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  domain        TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  report_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_report_count ON companies(report_count DESC);

-- ============================================================
-- RECRUITERS
-- ============================================================

CREATE TABLE recruiters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  title           TEXT,
  linkedin_url    TEXT UNIQUE,
  email           TEXT,
  report_count    INTEGER NOT NULL DEFAULT 0,
  standing_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruiters_company_id ON recruiters(company_id);
CREATE INDEX idx_recruiters_linkedin_url ON recruiters(linkedin_url);
CREATE INDEX idx_recruiters_report_count ON recruiters(report_count DESC);

-- ============================================================
-- SUBMITTERS
-- ============================================================

CREATE TABLE submitters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id    UUID UNIQUE,   -- references auth.users(id) if using Supabase Auth
  email           TEXT UNIQUE NOT NULL,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submitters_email ON submitters(email);
CREATE INDEX idx_submitters_auth_user_id ON submitters(auth_user_id);

-- ============================================================
-- SUBMISSIONS
-- ============================================================

CREATE TABLE submissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitter_id      UUID NOT NULL REFERENCES submitters(id) ON DELETE CASCADE,
  recruiter_id      UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Summary capped at 150 chars
  summary           TEXT NOT NULL CHECK (char_length(summary) <= 150),
  interview_date    DATE NOT NULL,
  last_contact_date DATE,
  role_applied      TEXT,
  status            submission_status NOT NULL DEFAULT 'pending',
  flag_count        INTEGER NOT NULL DEFAULT 0,
  has_rebuttal      BOOLEAN NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_recruiter_id ON submissions(recruiter_id);
CREATE INDEX idx_submissions_company_id ON submissions(company_id);
CREATE INDEX idx_submissions_submitter_id ON submissions(submitter_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_published_at ON submissions(published_at DESC);

-- ============================================================
-- FLAGS
-- ============================================================

CREATE TABLE flags (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  flagger_id     UUID REFERENCES submitters(id) ON DELETE SET NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flags_submission_id ON flags(submission_id);
CREATE UNIQUE INDEX idx_flags_unique_flagger ON flags(submission_id, flagger_id);

-- ============================================================
-- DISPUTES
-- ============================================================

CREATE TABLE disputes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  disputer_email      TEXT NOT NULL,
  disputer_name       TEXT,
  linkedin_url        TEXT,
  company_domain      TEXT,
  tier                dispute_tier NOT NULL DEFAULT 'tier_1',
  status              dispute_status NOT NULL DEFAULT 'pending',
  standing_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  rebuttal_text       TEXT,
  rebuttal_visible    BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_submission_id ON disputes(submission_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recruiters_updated_at
  BEFORE UPDATE ON recruiters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_submitters_updated_at
  BEFORE UPDATE ON submitters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- POSTGRES TRIGGERS: report_count maintenance
-- ============================================================

-- Recruiter report_count
CREATE OR REPLACE FUNCTION update_recruiter_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE recruiters SET report_count = report_count + 1 WHERE id = NEW.recruiter_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE recruiters SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.recruiter_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submission_recruiter_count
  AFTER INSERT OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_recruiter_report_count();

-- Company report_count
CREATE OR REPLACE FUNCTION update_company_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE companies SET report_count = report_count + 1 WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE companies SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submission_company_count
  AFTER INSERT OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_company_report_count();

-- ============================================================
-- POSTGRES TRIGGER: has_rebuttal flag
-- ============================================================

CREATE OR REPLACE FUNCTION sync_has_rebuttal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rebuttal_visible = TRUE AND (OLD.rebuttal_visible IS DISTINCT FROM TRUE) THEN
    UPDATE submissions SET has_rebuttal = TRUE WHERE id = NEW.submission_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dispute_rebuttal_visible
  AFTER UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION sync_has_rebuttal();
