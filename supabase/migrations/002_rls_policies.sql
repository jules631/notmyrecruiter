-- ============================================================
-- NotMyRecruiter — Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE submitters ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMPANIES — public read, service-role write
-- ============================================================

CREATE POLICY "companies_public_read"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "companies_service_insert"
  ON companies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "companies_service_update"
  ON companies FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================================
-- RECRUITERS — public read, service-role write
-- ============================================================

CREATE POLICY "recruiters_public_read"
  ON recruiters FOR SELECT
  USING (true);

CREATE POLICY "recruiters_service_insert"
  ON recruiters FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "recruiters_service_update"
  ON recruiters FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================================
-- SUBMITTERS — own row read/write; service-role full access
-- ============================================================

CREATE POLICY "submitters_own_read"
  ON submitters FOR SELECT
  USING (auth.uid() = auth_user_id OR auth.role() = 'service_role');

CREATE POLICY "submitters_own_insert"
  ON submitters FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id OR auth.role() = 'service_role');

CREATE POLICY "submitters_own_update"
  ON submitters FOR UPDATE
  USING (auth.uid() = auth_user_id OR auth.role() = 'service_role');

-- ============================================================
-- SUBMISSIONS — published are public; own pending; service-role full
-- ============================================================

-- Anyone can read published submissions
CREATE POLICY "submissions_public_read_published"
  ON submissions FOR SELECT
  USING (
    status = 'published'
    OR auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND submitter_id IN (
        SELECT id FROM submitters WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Authenticated users can insert their own submissions
CREATE POLICY "submissions_authenticated_insert"
  ON submissions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitter_id IN (
      SELECT id FROM submitters WHERE auth_user_id = auth.uid()
    )
  );

-- Service role can update (for verify-submission edge function)
CREATE POLICY "submissions_service_update"
  ON submissions FOR UPDATE
  USING (auth.role() = 'service_role');

-- Service role can delete
CREATE POLICY "submissions_service_delete"
  ON submissions FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- FLAGS — authenticated insert; service-role full
-- ============================================================

CREATE POLICY "flags_authenticated_insert"
  ON flags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "flags_service_read"
  ON flags FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND flagger_id IN (
        SELECT id FROM submitters WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "flags_service_delete"
  ON flags FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- DISPUTES — public insert (anyone can dispute); service-role full
-- ============================================================

CREATE POLICY "disputes_public_insert"
  ON disputes FOR INSERT
  WITH CHECK (true);

-- Only service role can read disputes (admin + edge functions)
CREATE POLICY "disputes_service_read"
  ON disputes FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "disputes_service_update"
  ON disputes FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "disputes_service_delete"
  ON disputes FOR DELETE
  USING (auth.role() = 'service_role');
