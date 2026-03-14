import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'NotMyRecruiter — Recruiter Accountability Platform',
  description:
    'Hold recruiters accountable. Report ghosting, broken promises, and unprofessional conduct after interviews.',
  openGraph: {
    title: 'NotMyRecruiter',
    description: 'Recruiter accountability. Community-driven.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
