---
name: release-prep
description: Decide the next version of each kenmon package that changed since its last release, and draft its CHANGELOG.md entry under that version on main. First step of a release, before /release-push.
argument-hint: '[package name ...]'
---

# Release prep: decide versions and draft changelogs

Decide the next version of each kenmon package that changed since its last release, and draft its changelog entry. Kenmon publishes five independently versioned packages from `packages/`:

| Directory                             | Package                              |
| ------------------------------------- | ------------------------------------ |
| `packages/kenmon`                     | `kenmon`                             |
| `packages/email-otp-authenticator`    | `@kenmon/email-otp-authenticator`    |
| `packages/google-oauth-authenticator` | `@kenmon/google-oauth-authenticator` |
| `packages/nextjs-adapter`             | `@kenmon/nextjs-adapter`             |
| `packages/react-router-adapter`       | `@kenmon/react-router-adapter`       |

Each release of a package is tagged `<name>@<version>`, e.g. `kenmon@1.0.0-pre.4` or `@kenmon/nextjs-adapter@1.0.0-pre.6`.

This skill writes only the changelog entries, uncommitted, and stops for review. Each entry's `## <version>` heading carries the version this skill decided, and a `- Requires kenmon@<version> or later.` bullet carries a `kenmon` peer range raise. `package.json` stays unchanged. The user confirms the release by staging the drafts. `/release-push` then reads the version from each staged entry, and `pnpm tag-release` sets it in `package.json`, raises each peer range that a `Requires` bullet names, commits, and tags. The `release.yml` workflow publishes each tag to npm.

## Arguments

Zero or more package names or directory names.

- `/release-prep kenmon @kenmon/nextjs-adapter` or `/release-prep kenmon nextjs-adapter`: draft those packages only.
- `/release-prep` (no argument): check every package and draft each one with user-facing changes.
- A token that names no package in the table: print ``Pass package names from packages/, e.g. `/release-prep kenmon`.`` and stop. No git reads, no file writes.

## What to do

### 1. Check the checkout

Releases run only on a `main` that matches `origin/main`.

- Run `git status --porcelain`.
- **Changes to `packages/*/CHANGELOG.md`?** → name the paths, tell the user they are drafts from an earlier run to review, stage, and release with `/release-push`, or to discard, and stop.
- **Any other change?** → name the paths, tell the user to commit or discard them, and stop.
- Run `git rev-parse --abbrev-ref HEAD`.
- **Branch is not `main`?** → run `git checkout main`.
- **Checkout fails (e.g. `main` is checked out in another worktree)?** → show the git error, tell the user to free up `main` or run the release from the worktree that has it, and stop.
- Run `git pull --ff-only origin main`.
- **Pull fails because local `main` has diverged from `origin/main`?** → tell the user to reconcile `main` with `origin/main`, and stop.
- Compare `git rev-parse main` with `git rev-parse origin/main`.
- **They differ (local `main` is ahead)?** → run `git push origin main`.
- **Push fails (e.g. someone else pushed to `origin/main` first)?** → show the git error, tell the user to rebase `main` onto `origin/main` and push, and stop.

### 2. Resolve each release range

For each candidate package (the argument's packages, or every package when no argument):

- Last release: `git describe --tags --abbrev=0 --match '<name>@*' HEAD`.
- Current version: `version` in `packages/<dir>/package.json`.
- Range: `<tag>..HEAD`. If no tag is found, use the full history as the range and say so in the report.

### 3. Collect each package's commits

- Run `git log <range> --no-merges --format='%h %s' -- packages/<dir>/`.
- Read the diffs you need (`git show <sha> -- packages/<dir>/`, `git diff <range> -- packages/<dir>/src/`) to understand what actually changed.
- Ignore noise. Test-only, formatting-only, dependency-bump, build-config, and package-metadata commits (e.g. a `repository` field) don't earn a line.
- **A package has no user-facing commits?** → drop that package. When the argument named it, say why in the report.
- **No package left to draft?** → tell the user there is nothing to release and stop.

### 4. Decide each version

Recommend one version per package, with one or two sentences of reasoning.

- **Current version is a prerelease (`1.0.0-pre.N`)?** → recommend `1.0.0-pre.<N+1>`. Every change, breaking or not, stays on the prerelease line until the user leaves it.
- **Current version is stable?** → recommend a semver `patch`, `minor`, or `major` bump from the commits.
- **The user names a version (e.g. `1.0.0` to leave the prerelease line)?** → use it.

### 5. Plan the dependents' `kenmon` peer range

`@kenmon/*` packages declare `kenmon` as a peer dependency (e.g. `"kenmon": "^1.0.0-pre.3"`) and as a `workspace:*` dev dependency. A caret range on a prerelease, such as `^1.0.0-pre.3`, already accepts every later `1.0.0-pre.N`.

This skill never edits `package.json`. It plans each peer range raise as a bullet in the dependent's draft, and `pnpm tag-release` applies it in the release commit once the user stages the draft.

- **`kenmon` is released and a dependent's code now needs the new `kenmon` version (it calls a new API, or relies on new behavior, even when it only takes effect with the new version)?** → raise that dependent's peer range.
- **The new `kenmon` version is outside a dependent's peer range (e.g. a stable `1.0.0` or a major bump)?** → raise that dependent's peer range.
- **Otherwise?** → leave the dependent's peer range alone.
- To raise a dependent's peer range: release the dependent (decide its version as in step 4, even when it has no other user-facing commit), and add the bullet `- Requires kenmon@<new kenmon version> or later.` as the last bullet of its draft, in that exact form. `pnpm tag-release` sets `peerDependencies.kenmon` to `^<new kenmon version>` from it.

### 6. Write the drafts

For each package to release:

- Add the new entry at the top of `packages/<dir>/CHANGELOG.md`, right under the `# <name>` title, in this exact shape:

```
## <version>

- <change 1: one line, user-facing, what changed and why it matters>
- <change 2>
```

- MUST NOT edit `package.json`. `pnpm tag-release` sets the version from the tag that `/release-push` reads from this heading, and the peer range from a `- Requires <name>@<version> or later.` bullet.
- Write the `Requires` bullet only for a peer range raise planned in step 5. Any bullet in that form changes `package.json` at release.
- Group related commits into one bullet, and lead each bullet with the user-facing effect. Write prose, not raw commit subjects.

**Write plainly. State facts, not impressions.** The default model voice reads as marketing copy, so strip it out:

- **No em-dashes.** Use a period, a comma, or a colon instead. Split run-on sentences into separate ones.
- **No vibe adjectives.** Cut words that assert quality without a fact behind them: "sharper", "richer", "tighter", "consistent", "powerful", "seamless", "robust". If a change is an improvement, say what it now does differently.
- **Full, factual sentences.** Each bullet is a complete sentence that describes what changed, in plain terms. Name the function, option, or behavior. Prefer "X now does Y instead of Z" over "X is improved".
- **Concise.** One idea per bullet. Don't re-narrate every file.

### 7. Report

For each drafted package, tell the user:

- the range used, and whether it fell back to the full history
- the version, with the reasoning
- the tag that `/release-push` will create once the drafts are staged: `<name>@<version>`

Then print the peer dependency plan, one line per dependent of `kenmon`, released or not:

```md
Peer dependencies, applied by `/release-push`:

- `@kenmon/nextjs-adapter`: `peerDependencies.kenmon` `^1.0.0-pre.3` → `^1.0.0-pre.5`. <one sentence: why it needs the new kenmon>
- `@kenmon/email-otp-authenticator`: `peerDependencies.kenmon` stays `^1.0.0-pre.3`.
```

Then stop for review.

- Next step: review the drafts, stage them with `git add` to confirm the release, then run `/release-push`.
- **The user changes a package's version during review?** → update the `## <version>` heading of its CHANGELOG.md entry. Nothing else holds the drafted version.
- **The user changes `kenmon`'s version during review?** → also update the `- Requires kenmon@<version> or later.` bullet in every dependent's draft.
- **The user drops a peer range raise during review?** → remove the `Requires` bullet from the dependent's draft. Nothing else holds the planned raise.

## Rules

- **Repo-local skill**: it documents kenmon's own releases.
- **Drives git directly**: no script backs it.
- **Main only**: drafts only on the `main` branch, matching `origin/main`. When the checkout is clean, it switches to `main`, fast-forwards it from `origin/main`, and pushes local `main` commits that `origin/main` lacks.
- **Decides and drafts only**: the changelog entries stay uncommitted. Staging them confirms the release, and `/release-push` then sets the versions and peer ranges, commits, tags, and pushes.
- **Writes only `packages/*/CHANGELOG.md`**: `package.json` stays unchanged, and `pnpm tag-release` rejects any other change in the release commit. Peer range raises live in the drafts as `Requires` bullets until `/release-push`.
