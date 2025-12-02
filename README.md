# Kenmon

A portable authentication module with pluggable providers and framework adapters.

## Monorepo Structure

### Packages

- **[kenmon](./packages/kenmon)** - Core authentication service
- **[@kenmon/nextjs-adapter](./packages/nextjs-adapter)** - Next.js framework adapter
- **[@kenmon/email-otp-provider](./packages/email-otp-provider)** - Email OTP authentication provider

### Apps

- **[nextjs-example](./apps/nextjs-example)** - Full Next.js implementation example

## Quick Start

```bash
pnpm add kenmon @kenmon/email-otp-provider @kenmon/nextjs-adapter
```

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

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management and publishing. We use independent versioning with pre-release mode enabled.

### Publishing a New Pre-release Version

1. **Make your code changes** across one or more packages

2. **Create a changeset** to document the changes:
   ```bash
   pnpm changeset
   ```
   - Select which packages changed (use spacebar to select, enter to confirm)
   - Choose the bump type:
     - `patch` - Bug fixes (1.0.0-pre.0 → 1.0.0-pre.1)
     - `minor` - New features (1.0.0-pre.0 → 1.0.1-pre.0)
     - `major` - Breaking changes (1.0.0-pre.0 → 1.1.0-pre.0)
   - Write a summary of the changes (used in CHANGELOG.md)

3. **Version the packages** to bump versions and generate changelogs:
   ```bash
   pnpm version-packages
   ```
   This will:
   - Update package.json versions with pre-release numbers (e.g., `1.0.0-pre.1`)
   - Generate/update CHANGELOG.md files
   - Delete consumed changeset files

4. **Review and commit** the version changes:
   ```bash
   git add .
   git commit -m "Version packages"
   ```

5. **Publish to npm**:
   ```bash
   pnpm release
   ```
   This will:
   - Build all packages
   - Publish changed packages to npm with the `pre` tag
   - Create git tags for each version

6. **Push changes and tags**:
   ```bash
   git push && git push --tags
   ```

### Exiting Pre-release Mode

When ready to publish a stable 1.0.0 release:

1. **Exit pre-release mode**:
   ```bash
   pnpm changeset pre exit
   ```

2. **Create a final changeset** for the stable release:
   ```bash
   pnpm changeset
   ```

3. **Version and publish** as normal:
   ```bash
   pnpm version-packages
   git add . && git commit -m "Release v1.0.0"
   pnpm release
   git push && git push --tags
   ```

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
