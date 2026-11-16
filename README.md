# Kenmon

A portable authentication module with pluggable providers and framework adapters.

## Monorepo Structure

### Packages

- **[kenmon](./packages/kenmon)** - Core authentication service
- **[@kenmon/nextjs-adapter](./packages/nextjs-adapter)** - Next.js framework adapter
- **[@kenmon/react-router-adapter](./packages/react-router-adapter)** - React Router framework adapter
- **[@kenmon/email-otp-authenticator](./packages/email-otp-authenticator)** - Email OTP authenticator
- **[@kenmon/google-oauth-authenticator](./packages/google-oauth-authenticator)** - Google OAuth authenticator

### Apps

Check these example to learn how to use the packages.

- **[nextjs-example](./apps/nextjs-example)** - Full Next.js implementation example
- **[react-router-example](./apps/react-router-example)** - Full React Router implementation example

See individual package READMEs for usage details and the [nextjs-example](./apps/nextjs-example) for a complete implementation.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Clean build artifacts
pnpm run clean
```

## Release Procedure

Each package in `packages/` has its own version and is released on its own. A release runs through two repo-local Claude Code skills, `/release-prep` and `/release-push`, on the `main` branch. CI publishes each package to npm.

### Publishing a Release

1. **Draft the release** with `/release-prep`. You can pass package names to limit the release, e.g. `/release-prep kenmon`.

   For each package with user-facing changes since its last `<name>@<version>` tag, the skill decides the next version and adds a `## <version>` entry at the top of the package's `CHANGELOG.md`. It does not edit `package.json`. The drafts stay uncommitted.

   When a dependent needs the new `kenmon` version, the skill stops and asks you to raise the dependent's `kenmon` peer range in a regular commit first.

2. **Review and stage the drafts**:

   ```bash
   git add packages/*/CHANGELOG.md
   ```

   Staging the drafts is the confirmation. `/release-push` asks no question, and it releases only staged drafts.

3. **Release** with `/release-push`. The skill:
   - builds one `<name>@<version>` tag from the `## <version>` heading of each staged draft
   - runs `pnpm tag-release <tags>`, which sets each version in `package.json`, commits it with the drafts, and tags the commit
   - runs `pnpm push-release`, which pushes `main` and then each new tag one at a time

4. **CI publishes** each tag. The `.github/workflows/release.yml` workflow runs once per tag and publishes that one package with npm Trusted Publishing. A prerelease version such as `1.0.0-pre.4` goes to the `pre` npm dist-tag, and a stable version goes to `latest`.

### Leaving the Pre-release Line

While a package is on `1.0.0-pre.N`, `/release-prep` drafts `1.0.0-pre.<N+1>`. To release a stable version, name it during the review, e.g. "release kenmon as 1.0.0", and `/release-prep` writes that version in the changelog heading instead.

### Installing Pre-release Versions

Users can install pre-release versions with:

```bash
# Install specific pre-release version
pnpm add kenmon@1.0.0-pre.1

# Install latest pre-release
pnpm add kenmon@pre
```

## License

MIT
