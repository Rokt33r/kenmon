import { google } from 'googleapis'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import type { KenmonReturnType } from 'kenmon'
import { KenmonError } from 'kenmon'
import type {
  KenmonGoogleOAuthAuthenticatorConfig,
  KenmonGoogleOAuthData,
  KenmonGoogleOAuthErrorReason,
  KenmonGoogleOAuthIdentifier,
  GoogleUserInfo,
  StatePayload,
} from './types'

export * from './types'

export class KenmonGoogleOAuthError extends KenmonError {
  readonly reason: KenmonGoogleOAuthErrorReason

  constructor(reason: KenmonGoogleOAuthErrorReason) {
    const messages: Record<KenmonGoogleOAuthErrorReason, string> = {
      'invalid-state': 'Invalid or expired state token',
      'expired-state': 'State token has expired',
      'invalid-code': 'Invalid or expired authorization code',
      'token-exchange-failed': 'Failed to exchange code for tokens',
      'profile-fetch-failed': 'Failed to fetch user profile from Google',
    }

    super(messages[reason])
    this.name = 'KenmonGoogleOAuthError'
    this.reason = reason
    Object.setPrototypeOf(this, KenmonGoogleOAuthError.prototype)
  }
}

export class KenmonGoogleOAuthAuthenticator {
  public readonly type = 'google-oauth'
  private readonly config: Required<KenmonGoogleOAuthAuthenticatorConfig>
  private readonly oauth2Client: any

  constructor(config: KenmonGoogleOAuthAuthenticatorConfig) {
    this.config = {
      ...config,
      scopes: config.scopes ?? ['openid', 'email', 'profile'],
    }

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri,
    )
  }

  /**
   * Generate Google OAuth authorization URL with JWT-signed state
   * @param intent - 'sign-in' or 'sign-up'
   * @returns Authorization URL string
   */
  getAuthUrl(intent: 'sign-in' | 'sign-up'): string {
    const state = this.generateStateToken(intent)

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'online',
      scope: this.config.scopes,
      state,
    })

    return authUrl
  }

  /**
   * Verify OAuth callback and exchange code for user profile
   * @param code - OAuth authorization code from callback
   * @param state - JWT state token from callback
   * @returns Object with intent and KenmonGoogleOAuthIdentifier
   */
  async verifyCallback(
    code: string,
    state: string,
  ): Promise<
    KenmonReturnType<{
      intent: 'sign-in' | 'sign-up'
      identifier: KenmonGoogleOAuthIdentifier
    }>
  > {
    // Verify state token
    const statePayload = this.verifyStateToken(state)
    if (!statePayload) {
      return {
        success: false,
        error: new KenmonGoogleOAuthError('invalid-state'),
      }
    }

    try {
      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code)

      if (!tokens.id_token) {
        return {
          success: false,
          error: new KenmonGoogleOAuthError('token-exchange-failed'),
        }
      }

      // Decode and verify ID token
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.config.clientId,
      })

      const payload = ticket.getPayload() as GoogleUserInfo

      if (!payload) {
        return {
          success: false,
          error: new KenmonGoogleOAuthError('profile-fetch-failed'),
        }
      }

      // Build KenmonIdentifier with user data
      const identifier: KenmonGoogleOAuthIdentifier = {
        type: 'google-oauth',
        value: payload.sub, // Google user ID
        data: {
          googleId: payload.sub,
          email: payload.email,
          emailVerified: payload.email_verified,
          name: payload.name,
          givenName: payload.given_name,
          familyName: payload.family_name,
          picture: payload.picture,
          locale: payload.locale,
        } satisfies KenmonGoogleOAuthData,
      }

      return {
        success: true,
        data: {
          intent: statePayload.intent,
          identifier,
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('invalid_grant') ||
          error.message.includes('Code was already redeemed')
        ) {
          return {
            success: false,
            error: new KenmonGoogleOAuthError('invalid-code'),
          }
        }
      }

      return {
        success: false,
        error: new KenmonGoogleOAuthError('token-exchange-failed'),
      }
    }
  }

  /**
   * Generate a JWT state token
   */
  private generateStateToken(intent: 'sign-in' | 'sign-up'): string {
    const payload: StatePayload = {
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
      nonce: randomBytes(16).toString('hex'),
      intent,
    }

    return jwt.sign(payload, this.config.secret)
  }

  /**
   * Verify and decode a JWT state token
   */
  private verifyStateToken(token: string): StatePayload | null {
    try {
      const payload = jwt.verify(token, this.config.secret) as StatePayload
      return payload
    } catch (error) {
      return null
    }
  }
}
