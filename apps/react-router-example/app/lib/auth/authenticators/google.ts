import { KenmonGoogleOAuthAuthenticator } from '@kenmon/google-oauth-authenticator'
import { config } from '../../config'

export const googleOAuthAuthenticator = new KenmonGoogleOAuthAuthenticator({
  clientId: config.googleOAuth.clientId,
  clientSecret: config.googleOAuth.clientSecret,
  redirectUri: config.googleOAuth.redirectUri,
  secret: config.sessionSecret,
})
