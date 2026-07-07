import type { MetadataRoute } from 'next'
import { fetchCatalog } from '@/lib/catalog-fetch'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pmxt-perps-markets.vercel.app'

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const markets = await fetchCatalog()

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]

  const marketEntries: MetadataRoute.Sitemap = markets.map((m) => ({
    url: `${SITE_URL}/markets/${m.name.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.8,
  }))

  return [...staticEntries, ...marketEntries]
}
