import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PMXT Markets',
  description: 'Browse and launch perpetual futures markets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-dark-bg text-white">
        {children}
      </body>
    </html>
  )
}
