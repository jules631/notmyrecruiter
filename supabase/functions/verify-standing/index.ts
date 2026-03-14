import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { dispute_id } = await req.json()

    if (!dispute_id) {
      return new Response(
        JSON.stringify({ error: 'dispute_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch dispute with submission, recruiter, and company info
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select(`
        *,
        submissions (
          id,
          company_id,
          recruiter_id,
          companies (id, domain),
          recruiters (id, linkedin_url, name)
        )
      `)
      .eq('id', dispute_id)
      .single()

    if (fetchError || !dispute) {
      return new Response(
        JSON.stringify({ error: 'Dispute not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const company = dispute.submissions?.companies
    const recruiter = dispute.submissions?.recruiters

    let tier: 'tier_1' | 'tier_2' = 'tier_1'
    let standingVerified = false
    const verificationNotes: string[] = []

    // ── Tier 1: Email domain matches company domain ──────────────────
    if (dispute.disputer_email && company?.domain) {
      const emailDomain = dispute.disputer_email.split('@')[1]?.toLowerCase().trim()
      const companyDomain = company.domain.toLowerCase().trim()

      if (emailDomain === companyDomain) {
        standingVerified = true
        tier = 'tier_1'
        verificationNotes.push(`Email domain "${emailDomain}" matches company domain.`)
      } else {
        verificationNotes.push(`Email domain "${emailDomain}" does NOT match company domain "${companyDomain}".`)
      }
    }

    // ── Tier 2: LinkedIn URL matches recruiter's LinkedIn URL ─────────
    if (dispute.linkedin_url && recruiter?.linkedin_url) {
      // Normalize LinkedIn URLs for comparison
      const normalizeLinkedIn = (url: string) =>
        url.toLowerCase().replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')

      const disputerProfile = normalizeLinkedIn(dispute.linkedin_url)
      const recruiterProfile = normalizeLinkedIn(recruiter.linkedin_url)

      if (disputerProfile === recruiterProfile && disputerProfile.length > 0) {
        standingVerified = true
        tier = 'tier_2'
        verificationNotes.push(`LinkedIn profile "${disputerProfile}" matches recruiter's profile.`)
      } else {
        verificationNotes.push(`LinkedIn profiles do not match: "${disputerProfile}" vs "${recruiterProfile}".`)
      }
    }

    // Update dispute with verification result
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        standing_verified: standingVerified,
        dispute_tier: tier,
        admin_notes: verificationNotes.join('\n'),
      })
      .eq('id', dispute_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        standing_verified: standingVerified,
        dispute_tier: tier,
        notes: verificationNotes,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('verify-standing error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
