import type { KenmonIdentifier } from 'kenmon'

export interface KenmonGoogleOAuthAuthenticatorConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  secret: string // For signing JWT state tokens
  scopes?: string[] // Default: ['openid', 'email', 'profile']
}

export interface GoogleUserInfo {
  // From openid
  sub: string // Google user ID (stable, unique identifier)
  iss: string // Issuer: "https://accounts.google.com"
  azp: string // Authorized party: your client ID
  aud: string // Audience: your client ID
  iat: number // Issued at timestamp
  exp: number // Expiration timestamp

  // From email scope
  email: string // "user@example.com"
  email_verified: boolean // Is email verified by Google?

  // From profile scope
  name: string // "John Doe"
  given_name: string // "John"
  family_name: string // "Doe"
  picture: string // "https://lh3.googleusercontent.com/..."
  locale: string // "en" - User's preferred language
}

export interface KenmonGoogleOAuthData {
  googleId: string
  email: string
  emailVerified: boolean
  name: string
  givenName: string
  familyName: string
  picture: string
  locale: string
}

/**
 * Google OAuth identifier with typed data
 * Extends KenmonIdentifier with Google-specific user profile data
 */
export interface KenmonGoogleOAuthIdentifier extends KenmonIdentifier {
  type: 'google-oauth'
  value: string // Google ID
  data: KenmonGoogleOAuthData
}

export interface StatePayload {
  iat: number // Issued at timestamp
  exp: number // Expires timestamp
  nonce: string // Random nonce for security
  intent: 'sign-in' | 'sign-up' // User intent
}

export type KenmonGoogleOAuthErrorReason =
  | 'invalid-state'
  | 'expired-state'
  | 'invalid-code'
  | 'token-exchange-failed'
  | 'profile-fetch-failed'
