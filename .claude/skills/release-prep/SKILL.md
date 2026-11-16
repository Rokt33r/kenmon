---
name: release-prep
description: Decide the next version of each kenmon package that changed since its last release, set it in the package's package.json, and draft its CHANGELOG.md entry on main. First step of a release, before /release-push.
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

Each release of a package is tagged `<name>@<version>`, e.g. `kenmon@1.0.0-pre.4` or `@kenmon/nextjs-adapter@1.0.0-pre.6`. The `version` in each `package.json` is the source of truth for the version. The CHANGELOG.md entry is release-note text only, and no script reads it.

This skill writes the version bumps and changelog entries uncommitted and stops for review. `/release-push` then confirms the tags, commits, tags, and pushes them, and the `release.yml` workflow publishes each tag to npm.

## Arguments

Zero or more package names or directory names.

- `/release-prep kenmon @kenmon/nextjs-adapter` or `/release-prep kenmon nextjs-adapter`: draft those packages only.
- `/release-prep` (no argument): check every package and draft each one with user-facing changes.
- A token that names no package in the table: print ``Pass package names from packages/, e.g. `/release-prep kenmon`.`` and stop. No git reads, no file writes.

## What to do

### 1. Check the checkout

Releases run only on a `main` that matches `origin/main`.

- Run `git status --porcelain`.
- **Changes to `packages/*/package.json` or `packages/*/CHANGELOG.md`?** → name the paths, tell the user they are drafts from an earlier run to review, stage, and release with `/release-push`, or to discard, and stop.
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

### 5. Check the dependents' `kenmon` peer range

`@kenmon/*` packages declare `kenmon` as a peer dependency (e.g. `"kenmon": "^1.0.0-pre.3"`) and as a `workspace:*` dev dependency. A caret range on a prerelease, such as `^1.0.0-pre.3`, already accepts every later `1.0.0-pre.N`.

- **`kenmon` is released and a dependent's code now needs the new `kenmon` version (it calls a new API, or relies on new behavior)?** → raise that dependent's `peerDependencies.kenmon` to `^<new kenmon version>`, and release that dependent too, even when its own code did not change.
- **The new `kenmon` version is outside a dependent's peer range (e.g. a stable `1.0.0` or a major bump)?** → raise the range and release the dependent the same way.
- **Otherwise?** → leave the dependent's peer range and version alone.
- MUST NOT change the `workspace:*` dev dependency.

### 6. Write the drafts

For each package to release:

- Run `npm version <version> --no-git-tag-version` in `packages/<dir>`. This sets `version` in `package.json` and nothing else.
- Edit `peerDependencies.kenmon` when step 5 raised it.
- Add the new entry at the top of `packages/<dir>/CHANGELOG.md`, right under the `# <name>` title, in this exact shape:

```
## <version>

- <change 1: one line, user-facing, what changed and why it matters>
- <change 2>
```

- **Step 5 raised the peer range?** → add the bullet `- Requires kenmon@<new kenmon version> or later.`
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
- the peer range change, if any
- the tag that `/release-push` will confirm: `<name>@<version>`

Then stop for review.

- Next step: review the drafts, stage them with `git add` to mark them reviewed, then run `/release-push`.
- **The user changes a package's version during review?** → rerun `npm version <version> --no-git-tag-version` in its directory and update the `## <version>` heading of its CHANGELOG.md entry to match.

## Rules

- **Repo-local skill**: it documents kenmon's own releases.
- **Drives git directly**: no script backs it.
- **Main only**: drafts only on the `main` branch, matching `origin/main`. When the checkout is clean, it switches to `main`, fast-forwards it from `origin/main`, and pushes local `main` commits that `origin/main` lacks.
- **Decides and drafts only**: the versions and changelog entries stay uncommitted. `/release-push` confirms the tags, then commits, tags, and pushes.
- **Writes only `packages/*/package.json` and `packages/*/CHANGELOG.md`**: `pnpm tag-release` rejects any other change in the release commit.
