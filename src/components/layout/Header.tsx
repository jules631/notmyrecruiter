'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="border-b border-[rgba(0,0,0,0.1)] bg-white sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="font-serif text-xl text-[var(--text-primary)] hover:text-accent transition-colors">
          NotMyRecruiter
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/'
                ? 'text-accent font-medium'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Browse
          </Link>
          <Link
            href="/about"
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/about'
                ? 'text-accent font-medium'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            About
          </Link>
          <Link href="/submit" className="btn-primary ml-2">
            Report an Incident
          </Link>
        </nav>
      </div>
    </header>
  )
}
