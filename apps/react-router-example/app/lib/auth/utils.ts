/**
 * Extracts IP address and user agent from the request object.
 *
 * This function can be customized based on your deployment environment:
 * - For Vercel/Netlify/most cloud providers: use 'x-real-ip'
 * - For Cloudflare: use 'cf-connecting-ip'
 * - For 'x-forwarded-for': Contains comma-separated IPs (client, proxy1, proxy2, ...)
 *   You need to split by comma and pick the correct index based on your infrastructure
 *   (number of CDNs/load balancers/reverse proxies between client and app)
 *
 * @param request - The Request object from React Router loader/action
 * @returns Object containing ipAddress and userAgent (both may be undefined)
 */
export function getRequestMetadata(request: Request): {
  ipAddress?: string
  userAgent?: string
} {
  try {
    // Extract IP address - customize this based on your hosting provider
    const ipAddress = request.headers.get('x-real-ip') || undefined

    // Extract user agent
    const userAgent = request.headers.get('user-agent') || undefined

    return { ipAddress, userAgent }
  } catch (error) {
    // If headers extraction fails, return undefined values
    console.warn('Failed to extract request metadata:', error)
    return { ipAddress: undefined, userAgent: undefined }
  }
}
