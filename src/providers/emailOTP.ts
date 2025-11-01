import { KenmonMailer, KenmonSignInPayload } from '../types'

export interface KenmonEmailTOPPreparationPayload {
  type: 'email-otp'
  data: {
    email: string
  }
}

export interface KenmonEmailOTPAuthSignInPayload extends KenmonSignInPayload {
  type: 'email-otp'
  data: {
    email: string
    requestId: string
    requestCode: string
  }
}

interface KenmonEmailOTPAuthProviderConfig {
  mailer: KenmonMailer
}

export class EmailOTPAuthProvider {
  config: KenmonEmailOTPAuthProviderConfig
  constructor(config: KenmonEmailOTPAuthProviderConfig) {
    this.config = config
  }

  verifySignInPayload(payload: KenmonSignInPayload) {
    if (!this.isSignInPayload(payload)) {
      return [new Error('Invalid sign in payload'), null]
    }
  }

  private isSignInPayload(
    payload: KenmonSignInPayload,
  ): payload is KenmonEmailOTPAuthSignInPayload {
    if (
      payload.type === 'email-otp' &&
      typeof payload.data.email === 'string'
    ) {
      return true
    }
    return false
  }
}
