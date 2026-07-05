import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Inter } from 'next/font/google'

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'pmxt·perps — launch anything',
  description: 'Trade perp markets on-chain. Permissionless. USDC settled.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body className="font-sans min-h-screen antialiased">
        <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-mono text-sm tracking-tight text-text">
              pmxt<span className="text-accent">·</span>perps
            </Link>
            <nav className="hidden md:flex gap-5 text-xs text-muted font-mono">
              <Link href="/" className="hover:text-text">markets</Link>
              <a href="#" className="hover:text-text">docs</a>
              <a href="#" className="hover:text-text">api</a>
            </nav>
            <div className="flex-1" />
            <span className="hidden sm:inline text-[10px] text-muted font-mono">arbitrum one</span>
            <button className="font-mono text-xs border border-border rounded-md px-3 py-1.5 text-muted hover:text-text hover:border-muted transition">
              connect wallet
            </button>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-10 text-[10px] text-muted font-mono">
          not financial advice · launch and trade perps permissionlessly · usdc-settled on arbitrum
        </footer>
      </body>
    </html>
  )
}
