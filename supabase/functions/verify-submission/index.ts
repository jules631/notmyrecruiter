import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATE_DAYS = 14           // minimum days since interview before publishing
const RATE_LIMIT_DAYS = 90     // one report per company per submitter per 90 days

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

    const { submission_id } = await req.json()

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

    // Check 2: 14-day gate since interview_date
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

    // Check 3: Rate limit — 1 submission per company per submitter per 90 days
    const rateLimitStart = new Date(Date.now() - RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000).toISOString()

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

    // All checks passed — publish the submission
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ status: 'published', published_at: now })
      .eq('id', submission_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, published_at: now }),
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
