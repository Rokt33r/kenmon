# @kenmon/google-oauth-authenticator

Google OAuth authenticator for Kenmon authentication system.

## Installation

```bash
npm install @kenmon/google-oauth-authenticator kenmon
```

## Setup

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set up OAuth consent screen
6. Add authorized redirect URIs (e.g., `http://localhost:3000/auth/callback/google`)
7. Copy your **Client ID** and **Client Secret**

### 2. Configure Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google
SESSION_SECRET=your-session-secret-for-jwt-signing
```

## Usage

### Create Authenticator Instance

```typescript
import { KenmonGoogleOAuthAuthenticator } from '@kenmon/google-oauth-authenticator'

export const googleAuth = new KenmonGoogleOAuthAuthenticator({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  secret: process.env.SESSION_SECRET!, // For signing state tokens
  scopes: ['openid', 'email', 'profile'], // Optional, these are defaults
})
```

### Step 1: Redirect to Google

Choose the intent based on the user's action:

```typescript
// For sign-in
const authUrl = googleAuth.getAuthUrl('sign-in')
redirect(authUrl)

// For sign-up
const authUrl = googleAuth.getAuthUrl('sign-up')
redirect(authUrl)
```

### Step 2: Handle OAuth Callback

The callback route handles both sign-in and sign-up based on the intent:

```typescript
// In your OAuth callback route (e.g., /auth/callback/google)
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return redirect('/signin?error=Missing parameters')
  }

  // Verify callback and get intent and identifier
  const result = await googleAuth.verifyCallback(code, state)

  if (!result.success) {
    console.error(result.error)
    return redirect(`/signin?error=${encodeURIComponent(result.error.message)}`)
  }

  const { intent, identifier } = result.data

  // Get request metadata
  const ipAddress = request.headers.get('x-forwarded-for') || undefined
  const userAgent = request.headers.get('user-agent') || undefined

  // Sign in or sign up based on intent
  if (intent === 'sign-in') {
    const signInResult = await auth.signIn(identifier, { ipAddress, userAgent })
    if (!signInResult.success) {
      return redirect(`/signin?error=${encodeURIComponent(signInResult.error.message)}`)
    }
  } else {
    const signUpResult = await auth.signUp(identifier, {}, { ipAddress, userAgent })
    if (!signUpResult.success) {
      return redirect(`/signup?error=${encodeURIComponent(signUpResult.error.message)}`)
    }
  }

  return redirect('/')
}
```

## TypeScript Types

The authenticator exports typed interfaces for better IDE support:

```typescript
import type { KenmonGoogleOAuthIdentifier } from '@kenmon/google-oauth-authenticator'

// The identifier returned from verifyCallback has this shape:
interface KenmonGoogleOAuthIdentifier {
  type: 'google-oauth'
  value: string // Google user ID
  data: {
    googleId: string         // Unique Google user ID
    email: string            // User's email
    emailVerified: boolean   // Is email verified by Google?
    name: string             // Full name
    givenName: string        // First name
    familyName: string       // Last name
    picture: string          // Profile picture URL
    locale: string           // User's locale (e.g., "en")
  }
}
```

## Security

- **State Token**: Uses JWT-signed state tokens for CSRF protection
- **Expiration**: State tokens expire in 10 minutes
- **Nonce**: Each state token includes a random nonce
- **Stateless**: No database required for OAuth flow

## Error Handling

The authenticator can return these error reasons:

- `invalid-state` - JWT state verification failed
- `expired-state` - State token expired
- `invalid-code` - OAuth authorization code is invalid or expired
- `token-exchange-failed` - Failed to exchange code for tokens
- `profile-fetch-failed` - Failed to fetch user profile

## Example: Next.js App Router

```typescript
// app/auth/google/route.ts
import { googleAuth } from '@/lib/auth/authenticators/google'

export async function GET() {
  const authUrl = googleAuth.getAuthUrl('sign-in')
  return Response.redirect(authUrl)
}
```

```typescript
// app/auth/callback/google/route.ts
import { googleAuth } from '@/lib/auth/authenticators/google'
import { auth } from '@/lib/auth/auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return Response.redirect('/signin?error=Missing parameters')
  }

  const result = await googleAuth.verifyCallback(code, state)

  if (!result.success) {
    return Response.redirect(`/signin?error=${encodeURIComponent(result.error.message)}`)
  }

  const { intent, identifier } = result.data

  const ipAddress = request.headers.get('x-forwarded-for') || undefined
  const userAgent = request.headers.get('user-agent') || undefined

  if (intent === 'sign-in') {
    await auth.signIn(identifier, { ipAddress, userAgent })
  } else {
    await auth.signUp(identifier, {}, { ipAddress, userAgent })
  }

  return Response.redirect('/')
}
```

## License

MIT
