import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '../../lib/auth'

export async function GET(request: NextRequest) {
  await auth.signOut()
  return NextResponse.redirect(new URL('/', request.url))
}
