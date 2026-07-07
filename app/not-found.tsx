import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — not found',
  robots: {
    index: false,
  },
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center font-mono">
      <h1 className="text-4xl text-text mb-4">
        404<span className="text-accent">·</span>not found
      </h1>
      <p className="text-muted text-sm mb-8">
        This market or page doesn&apos;t exist on-chain.
      </p>
      <Link href="/" className="text-accent hover:underline text-sm">
        &larr; back to pmxt·perps
      </Link>
    </div>
  )
}
