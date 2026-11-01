import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/guides'],
        // Signed-in app pages and APIs are private and have no search value.
        disallow: ['/api/', '/dashboard', '/devices', '/history', '/billing', '/analysis', '/knowledge', '/profile'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
