import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 font-mono text-xs text-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          pmxt<span className="text-accent">·</span>perps — permissionless perp markets on Solana. USDC settled.
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/" className="hover:text-text transition">home</Link>
          <Link href="/portfolio" className="hover:text-text transition">portfolio</Link>
          <a href="/docs" className="hover:text-text transition">docs</a>
        </nav>
        <div>&copy; {year} pmxt</div>
      </div>
    </footer>
  )
}
