import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATE_DAYS = 14           // minimum days since interview before publishing
const RATE_LIMIT_DAYS = 90     // one report per company per submitter per 90 days
const EVIDENCE_EXPIRY_DAYS = 7 // auto-remove pending submissions with unreviewed evidence after 7 days

// Evidence types that earn interaction_confirmed tier
const INTERACTION_CONFIRMED_TYPES = [
  'calendar_invite',
  'ats_confirmation',
  'linkedin_message',
  'recruiter_email',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const body = await req.json()
    const { submission_id, purge_stale } = body

    // ── Purge stale unreviewed submissions ───────────────────
    // Called on a schedule (e.g. daily cron) with { purge_stale: true }
    if (purge_stale) {
      const expiryDate = new Date(
        Date.now() - EVIDENCE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      ).toISOString()

      const { data: stale, error: staleError } = await supabase
        .from('submissions')
        .select('id, evidence_storage_path')
        .eq('status', 'pending')
        .eq('evidence_reviewed', false)
        .lt('created_at', expiryDate)

      if (staleError) throw staleError

      const now = new Date().toISOString()
      for (const s of stale ?? []) {
        // Delete evidence from storage if present
        if (s.evidence_storage_path) {
          await supabase.storage.from('evidence').remove([s.evidence_storage_path])
        }
        await supabase
          .from('submissions')
          .update({
            status: 'removed',
            evidence_deleted_at: now,
            evidence_storage_path: null,
          })
          .eq('id', s.id)
      }

      return new Response(
        JSON.stringify({ success: true, purged: stale?.length ?? 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'submission_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch submission with submitter and company info
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select(`
        *,
        submitters (id, email, email_verified),
        companies (id, domain)
      `)
      .eq('id', submission_id)
      .single()

    if (fetchError || !submission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (submission.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Submission is already ${submission.status}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check 1: Email verified
    if (!submission.submitters?.email_verified) {
      return new Response(
        JSON.stringify({ error: 'Submitter email is not verified' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check 2: Evidence must be reviewed before publication
    if (!submission.evidence_reviewed) {
      return new Response(
        JSON.stringify({
          error: 'Submission cannot be published until evidence has been reviewed by an admin.',
          verification_tier: 'email_only',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check 3: 14-day gate since interview_date
    const interviewDate = new Date(submission.interview_date)
    const daysSinceInterview = (Date.now() - interviewDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceInterview < GATE_DAYS) {
      const daysRemaining = Math.ceil(GATE_DAYS - daysSinceInterview)
      return new Response(
        JSON.stringify({
          error: `Submission requires a ${GATE_DAYS}-day waiting period after interview. ${daysRemaining} day(s) remaining.`,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check 4: Rate limit — 1 submission per company per submitter per 90 days
    const rateLimitStart = new Date(
      Date.now() - RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: recentSubmissions, error: rateError } = await supabase
      .from('submissions')
      .select('id')
      .eq('submitter_id', submission.submitter_id)
      .eq('company_id', submission.company_id)
      .neq('id', submission_id)
      .in('status', ['published', 'pending', 'under_review'])
      .gte('created_at', rateLimitStart)

    if (rateError) {
      console.error('Rate limit check error:', rateError)
      throw rateError
    }

    if (recentSubmissions && recentSubmissions.length > 0) {
      return new Response(
        JSON.stringify({
          error: `You have already submitted a report for this company within the last ${RATE_LIMIT_DAYS} days.`,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine verification tier from evidence_type
    let verificationTier: string
    if (submission.evidence_type === 'followup_screenshot') {
      verificationTier = 'header_verified'
    } else if (INTERACTION_CONFIRMED_TYPES.includes(submission.evidence_type)) {
      verificationTier = 'interaction_confirmed'
    } else {
      // Fallback: evidence_reviewed is true but type is unknown — treat as interaction_confirmed
      verificationTier = 'interaction_confirmed'
    }

    // All checks passed — publish the submission
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'published',
        published_at: now,
        verification_tier: verificationTier,
      })
      .eq('id', submission_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, published_at: now, verification_tier: verificationTier }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('verify-submission error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
