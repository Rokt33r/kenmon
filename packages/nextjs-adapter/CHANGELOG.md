# @kenmon/nextjs-adapter

## 1.0.0-pre.6

- `deleteCookie` now passes the cookie options it receives to `cookies().delete`, so sign-out clears a `Secure` session cookie with a `__Host-` or `__Secure-` prefix.
- Requires kenmon@1.0.0-pre.5 or later.

## 1.0.0-pre.5

### Patch Changes

- Fix esm modules
- Updated dependencies
  - kenmon@1.0.0-pre.3

## 1.0.0-pre.4

### Patch Changes

- Updated readme
- Updated dependencies
  - kenmon@1.0.0-pre.2

## 1.0.0-pre.3

### Patch Changes

- Fix SessionRefresh action prop

## 1.0.0-pre.2

### Patch Changes

- Replace provider with authenticator and add google oauth authenticator
- Updated dependencies
  - kenmon@1.0.0-pre.1
