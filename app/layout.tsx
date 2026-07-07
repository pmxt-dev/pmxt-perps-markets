import './globals.css'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { JetBrains_Mono, Inter } from 'next/font/google'
import { SolanaProvider } from '@/components/SolanaProvider'
import { ConnectButton } from '@/components/ConnectButton'
import { Footer } from '@/components/Footer'

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pmxt-perps-markets.vercel.app'
const SITE_NAME = 'pmxt·perps'
const SITE_DESCRIPTION = 'Trade perp markets on-chain. Permissionless. USDC settled.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — launch anything`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — launch anything`,
    description: SITE_DESCRIPTION,
    url: '/',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — launch anything`,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: `${SITE_URL}/icon`,
  }

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  }

  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body className="font-sans min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <SolanaProvider>
          <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
              <Link href="/" className="font-mono text-sm tracking-tight text-text">
                pmxt<span className="text-accent">·</span>perps
              </Link>
              <nav className="font-mono text-xs flex items-center gap-4">
                <Link href="/portfolio" className="text-muted hover:text-text transition">portfolio</Link>
                <a href="/docs" className="text-muted hover:text-text transition">docs</a>
              </nav>
              <div className="flex-1" />
              <ConnectButton />
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          <Footer />
        </SolanaProvider>
      </body>
    </html>
  )
}
