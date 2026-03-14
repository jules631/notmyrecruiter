import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--card-border)] bg-white mt-16">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-serif text-sm text-[var(--text-secondary)]">
          NotMyRecruiter
        </span>
        <nav className="flex gap-5 text-sm text-[var(--text-secondary)]">
          <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">
            Community Standards
          </Link>
          <Link href="/submit" className="hover:text-[var(--text-primary)] transition-colors">
            Submit a Report
          </Link>
        </nav>
        <p className="text-xs text-[var(--text-secondary)]">
          &copy; {new Date().getFullYear()} NotMyRecruiter
        </p>
      </div>
    </footer>
  )
}
