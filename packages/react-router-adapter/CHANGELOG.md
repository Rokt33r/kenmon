# @kenmon/react-router-adapter

## 1.0.0-pre.5

- `deleteCookie` now writes the cookie options it receives (`Secure`, `HttpOnly`, `SameSite`, `Path`) into the clearing `Set-Cookie` header with `Max-Age=0`, so sign-out clears a `Secure` session cookie with a `__Host-` or `__Secure-` prefix. Before, the header carried only `Max-Age=0; Path=/`.
- Requires kenmon@1.0.0-pre.5 or later.

## 1.0.0-pre.4

### Patch Changes

- Export SessionRefresh component separately

## 1.0.0-pre.3

### Patch Changes

- Fix esm modules
- Updated dependencies
  - kenmon@1.0.0-pre.3

## 1.0.0-pre.2

### Patch Changes

- Updated readme
- Updated dependencies
  - kenmon@1.0.0-pre.2

## 1.0.0-pre.1

### Patch Changes

- Replace provider with authenticator and add google oauth authenticator
- Updated dependencies
  - kenmon@1.0.0-pre.1
