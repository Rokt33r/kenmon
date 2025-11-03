import { headers } from 'next/headers'

/**
 * Extracts IP address and user agent from the request headers.
 *
 * This function can be customized based on your deployment environment:
 * - For Vercel/Netlify/most cloud providers: use 'x-real-ip'
 * - For Cloudflare: use 'cf-connecting-ip'
 * - For 'x-forwarded-for': Contains comma-separated IPs (client, proxy1, proxy2, ...)
 *   You need to split by comma and pick the correct index based on your infrastructure
 *   (number of CDNs/load balancers/reverse proxies between client and app)
 * - For local development: It is not possible to get the client IP address directly
 *   in Next.js server actions
 *
 * @returns Object containing ipAddress and userAgent (both may be undefined)
 */
export async function getRequestMetadata(): Promise<{
  ipAddress?: string
  userAgent?: string
}> {
  try {
    const headersList = await headers()

    // Extract IP address - customize this based on your hosting provider
    const ipAddress = headersList.get('x-real-ip') || undefined

    // Extract user agent
    const userAgent = headersList.get('user-agent') || undefined

    return { ipAddress, userAgent }
  } catch (error) {
    // If headers() doesn't work or fails, return undefined values
    console.warn('Failed to extract request metadata:', error)
    return { ipAddress: undefined, userAgent: undefined }
  }
}
