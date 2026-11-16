# kenmon

## 1.0.0-pre.4

- The session JWT now carries an `exp` claim set from `session.ttl`, so the token expires together with its session and cookie.
- `verifySession` now returns `KenmonSessionExpiredError` for an expired session JWT, and `KenmonInvalidSessionError` for a session JWT without an `exp` claim.
- Session cookies issued by `1.0.0-pre.3` or earlier have no `exp` claim, so `verifySession` and `refreshSession` reject them, and those users must sign in again.

## 1.0.0-pre.3

### Patch Changes

- Fix esm modules

## 1.0.0-pre.2

### Patch Changes

- Updated readme

## 1.0.0-pre.1

### Patch Changes

- Replace provider with authenticator and add google oauth authenticator
