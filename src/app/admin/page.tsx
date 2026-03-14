import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminQueue from '@/components/admin/AdminQueue'

export const metadata: Metadata = {
  title: 'Admin — NotMyRecruiter',
}

export default async function AdminPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin')
  }

  // Simple role check — in production, use a proper roles table or JWT custom claims
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/')
  }

  // Fetch flagged submissions (under_review)
  const { data: flaggedSubmissions } = await supabase
    .from('submissions')
    .select(`*, recruiters (*, companies (*)), companies (*)`)
    .eq('status', 'under_review')
    .order('flag_count', { ascending: false })

  // Fetch pending disputes
  const { data: pendingDisputes } = await supabase
    .from('disputes')
    .select(`*, submissions (*, recruiters (*), companies (*))`)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[var(--text-primary)]">Admin Queue</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Flagged reports and pending disputes
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="chip chip-inactive">
            {flaggedSubmissions?.length ?? 0} flagged
          </span>
          <span className="chip chip-inactive">
            {pendingDisputes?.length ?? 0} disputes
          </span>
        </div>
      </div>

      <AdminQueue
        flaggedSubmissions={flaggedSubmissions ?? []}
        pendingDisputes={pendingDisputes ?? []}
      />
    </div>
  )
}
