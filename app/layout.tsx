import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Inter } from 'next/font/google'
import { SolanaProvider } from '@/components/SolanaProvider'
import { ConnectButton } from '@/components/ConnectButton'

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
        <SolanaProvider>
          <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
              <Link href="/" className="font-mono text-sm tracking-tight text-text">
                pmxt<span className="text-accent">·</span>perps
              </Link>
              <nav className="font-mono text-xs flex items-center gap-4">
                <Link href="/portfolio" className="text-muted hover:text-text transition">portfolio</Link>
              </nav>
              <div className="flex-1" />
              <ConnectButton />
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </SolanaProvider>
      </body>
    </html>
  )
}
