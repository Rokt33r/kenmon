import { NextRequest, NextResponse } from 'next/server'

import { AuthService } from '../auth'

export function createAuthRouteHandler(authService: AuthService) {
  return async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ auth: string[] }> },
  ) {
    const path = (await params).auth?.join('/') || ''

    // Handle different auth routes
    switch (path) {
      case 'refresh':
        if (request.method !== 'POST') {
          return NextResponse.json(
            { error: 'Method not allowed' },
            { status: 405 },
          )
        }
        return handleRefresh(authService)

      case 'signout':
        if (request.method !== 'POST') {
          return NextResponse.json(
            { error: 'Method not allowed' },
            { status: 405 },
          )
        }
        return handleSignOut(authService)

      default:
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }
}

async function handleRefresh(authService: AuthService): Promise<NextResponse> {
  try {
    const result = await authService.verifySession()

    if (!result) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    // Check if session needs refresh
    if (authService.needsRefresh(result.session.updatedAt)) {
      await authService.refreshSession(result.session.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Refresh session error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleSignOut(authService: AuthService): Promise<NextResponse> {
  try {
    await authService.signOut()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
