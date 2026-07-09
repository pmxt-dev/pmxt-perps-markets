import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchCatalog, fetchMarketById } from '@/lib/catalog-fetch'
import MarketDetailClient from '@/components/MarketDetailClient'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.perpify.io'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const id = rawId.toLowerCase()
  const m = await fetchMarketById(id)

  if (!m) {
    return {
      title: 'Market not found — pmxt·perps',
      robots: { index: false },
    }
  }

  // the layout template appends " · pmxt·perps", so keep this bare to avoid the
  // "DDR5 — pmxt·perps · pmxt·perps" double. The client sets a live-price title.
  const title = m.name
  const description =
    m.meta?.description || `Trade ${m.name} perpetual futures on-chain, permissionless, USDC-settled.`
  const url = `/perps/${id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [`/perps/${id}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/perps/${id}/opengraph-image`],
    },
  }
}

export default async function MarketDetailPage({ params }: PageProps) {
  const { id: rawId } = await params
  const id = rawId.toLowerCase()
  const catalog = await fetchCatalog()
  const m = catalog.find(x => x.name.toLowerCase() === id)

  // only 404 when the catalog loaded successfully AND the market is genuinely
  // absent — an unreachable upstream or an empty catalog must never 404
  if (catalog.length > 0 && !m) {
    notFound()
  }

  const ld = m
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: m.name,
          description: m.meta?.description || `${m.name} perpetual futures on Solana, permissionless, USDC-settled.`,
          category: m.meta?.category ?? undefined,
          image: m.meta?.thumbnail ?? undefined,
          url: `${SITE_URL}/perps/${id}`,
          brand: {
            '@type': 'Organization',
            name: 'pmxt·perps',
          },
          offers: {
            '@type': 'Offer',
            price: String(m.markPrice),
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/perps/${id}`,
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Markets', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 3, name: m.name, item: `${SITE_URL}/perps/${id}` },
          ],
        },
      ]
    : []

  return (
    <>
      {ld.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <MarketDetailClient id={id} />
    </>
  )
}
