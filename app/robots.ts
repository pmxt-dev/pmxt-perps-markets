import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pmxt-perps-markets.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/portfolio', '/v0/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
