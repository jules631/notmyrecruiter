import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FLAG_THRESHOLD = 5  // auto-set under_review when flag_count reaches this

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

    const { submission_id, flagger_id, reason } = await req.json()

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'submission_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch current submission
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('id, flag_count, status')
      .eq('id', submission_id)
      .single()

    if (fetchError || !submission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (submission.status === 'removed') {
      return new Response(
        JSON.stringify({ error: 'Cannot flag a removed submission' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert the flag record (unique constraint prevents duplicate flags per user)
    const { error: flagError } = await supabase
      .from('flags')
      .insert({
        submission_id,
        flagger_id: flagger_id ?? null,
        reason: reason ?? null,
      })

    if (flagError) {
      if (flagError.code === '23505') {
        // Unique violation — already flagged
        return new Response(
          JSON.stringify({ error: 'You have already flagged this submission' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw flagError
    }

    // Increment flag_count
    const newFlagCount = submission.flag_count + 1
    const newStatus =
      newFlagCount >= FLAG_THRESHOLD && submission.status === 'published'
        ? 'under_review'
        : submission.status

    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        flag_count: newFlagCount,
        status: newStatus,
      })
      .eq('id', submission_id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        flag_count: newFlagCount,
        status: newStatus,
        auto_reviewed: newStatus === 'under_review',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('flag-threshold error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
