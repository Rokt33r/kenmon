export class KenmonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KenmonError'
    Object.setPrototypeOf(this, KenmonError.prototype)
  }
}

export class KenmonInvalidPayloadError extends KenmonError {
  constructor(message: string) {
    super(message)
    this.name = 'KenmonInvalidPayloadError'
    Object.setPrototypeOf(this, KenmonInvalidPayloadError.prototype)
  }
}

export class KenmonUserNotFoundError extends KenmonError {
  constructor() {
    super('User not found')
    this.name = 'KenmonUserNotFoundError'
    Object.setPrototypeOf(this, KenmonUserNotFoundError.prototype)
  }
}

export class KenmonUserAlreadyExistsError extends KenmonError {
  constructor(identifier: string) {
    super(`User with ${identifier} already exists`)
    this.name = 'KenmonUserAlreadyExistsError'
    Object.setPrototypeOf(this, KenmonUserAlreadyExistsError.prototype)
  }
}

export class KenmonSessionNotFoundError extends KenmonError {
  constructor() {
    super('No session cookie found')
    this.name = 'KenmonSessionNotFoundError'
    Object.setPrototypeOf(this, KenmonSessionNotFoundError.prototype)
  }
}

export class KenmonInvalidSessionError extends KenmonError {
  constructor() {
    super('Invalid session')
    this.name = 'KenmonInvalidSessionError'
    Object.setPrototypeOf(this, KenmonInvalidSessionError.prototype)
  }
}

export class KenmonSessionExpiredError extends KenmonError {
  constructor() {
    super('Session expired')
    this.name = 'KenmonSessionExpiredError'
    Object.setPrototypeOf(this, KenmonSessionExpiredError.prototype)
  }
}
