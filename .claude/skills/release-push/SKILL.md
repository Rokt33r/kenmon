---
name: release-push
description: Turn the package versions that /release-prep drafted and the user staged into one tagged kenmon release commit on main, and push it with its tags, by running `pnpm tag-release <tags>` then `pnpm push-release`. Second and last step of a release.
---

# Release push: commit, tag, and push kenmon's release

Build the `<name>@<version>` tags from the staged `package.json` versions that `/release-prep` drafted. Staging the drafts is the user's confirmation, so the skill asks no question. Run `pnpm tag-release <tags>`, which checks each tag against its staged `package.json` version, commits the staged drafts as one release commit, and tags it. Then run `pnpm push-release`, which pushes `main` and each unpushed tag one at a time, so every tag fires its own `release.yml` run, which publishes that package to npm.

## Arguments

None.

## What to do

### 1. Build the tags from the staged versions

- Run `git diff --cached --name-only -- 'packages/*/package.json'`.
- For each path, read the staged version with `git show :<path>` and the released version with `git show HEAD:<path>`, and keep each package whose `version` differs, with its `name`.
- **No staged version change?** → tell the user to run `/release-prep`, then review and stage its drafts, and stop.
- Build one tag per package: `<name>@<version>`, e.g. `kenmon@1.0.0-pre.4` or `@kenmon/nextjs-adapter@1.0.0-pre.6`.

### 2. Tag the release

- Run `pnpm tag-release <tag> <tag> ...` from the repo root, with every tag from step 1.
- **The script exits non-zero?** → relay its message and stop. Name the fix it points to: `/release-prep` for missing drafts, reviewing and staging the drafts for unstaged ones, committing or discarding other changes, switching to `main` for the branch check, fixing the staged version for a tag mismatch.

### 3. Push the release

- Run `pnpm push-release` from the repo root.
- **The script exits non-zero?** → relay the git error, say which of `main` and the new tags reached `origin` per the script's output, and stop. Name the fix: rerun `pnpm push-release` after a transient failure, since it skips tags already on `origin`; rebase `main` onto `origin/main` first when the `main` push was rejected.

### 4. Report

Print the report following the **report template** below, filled from both scripts' output.

- List one tag line per released package.
- Name the dist-tag from the version: its prerelease id (`pre` for `1.0.0-pre.4`), or `latest` for a stable version.

**report template**

```md
Released the commit `{shortsha}` "{commit subject}" and pushed `main` with its tags

- `kenmon@1.0.0-pre.4`, publishing to npm under the `pre` dist-tag through the `release.yml` workflow
- `@kenmon/nextjs-adapter@1.0.0-pre.6`, publishing to npm under the `pre` dist-tag through the `release.yml` workflow
```

## Rules

- **Repo-local skill**: it documents kenmon's own releases.
- **Staged means confirmed**: the user confirms a release by staging the drafts, so the skill asks no question before it runs the scripts. The script tags only drafts the user has staged, and stops on any draft that is untracked or has unstaged edits.
- **Scripts own the git work**: the skill never edits versions, commits, tags, or pushes by hand.
