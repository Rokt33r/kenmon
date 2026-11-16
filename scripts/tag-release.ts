import { execFileSync } from 'node:child_process'

type PackageVersionChange = {
  name: string
  version: string
  packageJsonPath: string
}

type ReleaseTag = {
  tag: string
  name: string
  version: string
}

const RELEASE_BRANCH = 'main'
const PACKAGE_JSON_PATH_PATTERN = /^packages\/[^/]+\/package\.json$/
const CHANGELOG_PATH_PATTERN = /^packages\/[^/]+\/CHANGELOG\.md$/
const STAGED_STATUSES = new Set(['M ', 'A '])
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

main()

function main(): void {
  const repoRoot = process.cwd()

  const releaseTags = parseReleaseTags(process.argv.slice(2))
  assertOnReleaseBranch(repoRoot)
  const stagedPaths = findStagedReleasePaths(repoRoot)
  const versionChanges = findPackageVersionChanges(repoRoot, stagedPaths)
  assertTagsMatchVersionChanges(releaseTags, versionChanges)
  assertTagsAreNew(repoRoot, releaseTags)

  const commitMessage = releaseTags
    .map((releaseTag) => releaseTag.tag)
    .join(', ')
  git(repoRoot, ['commit', '-m', commitMessage], 'inherit')
  for (const releaseTag of releaseTags) {
    git(
      repoRoot,
      ['tag', '-a', releaseTag.tag, '-m', releaseTag.tag],
      'inherit',
    )
  }

  printNextSteps(commitMessage, releaseTags)
}

function parseReleaseTags(args: string[]): ReleaseTag[] {
  if (args.length === 0) {
    fail(
      'Pass the confirmed release tags, e.g. pnpm tag-release kenmon@1.0.0-pre.4',
    )
  }

  const releaseTags = args.map(parseReleaseTag)
  const seenNames = new Set<string>()
  for (const releaseTag of releaseTags) {
    if (seenNames.has(releaseTag.name)) {
      fail(`More than one tag names the package ${releaseTag.name}.`)
    }
    seenNames.add(releaseTag.name)
  }
  return releaseTags
}

function parseReleaseTag(tag: string): ReleaseTag {
  const separatorIndex = tag.lastIndexOf('@')
  if (separatorIndex <= 0) {
    fail(`${tag} is not a <name>@<version> tag.`)
  }
  const name = tag.slice(0, separatorIndex)
  const version = tag.slice(separatorIndex + 1)
  if (!VERSION_PATTERN.test(version)) {
    fail(`${tag} has an invalid version: ${version}`)
  }
  return { tag, name, version }
}

function assertOnReleaseBranch(repoRoot: string): void {
  const branch = git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
  if (branch !== RELEASE_BRANCH) {
    fail(
      `Releases are tagged only on the ${RELEASE_BRANCH} branch (current: ${branch}).`,
    )
  }
}

function findStagedReleasePaths(repoRoot: string): string[] {
  const gitStatusLines = git(repoRoot, [
    'status',
    '--porcelain',
    '--untracked-files=all',
  ])
    .split('\n')
    .filter((line) => line !== '')

  if (gitStatusLines.length === 0) {
    fail(
      'No staged release changes. Run /release-prep, then review and stage its drafts.',
    )
  }

  const otherChanges = gitStatusLines.filter(
    (line) => !isReleasePath(line.slice(3)),
  )
  if (otherChanges.length > 0) {
    fail(
      `The working tree has changes other than package.json and CHANGELOG.md drafts:\n${otherChanges.join('\n')}\nCommit or discard them before tagging a release.`,
    )
  }

  const unstagedChanges = gitStatusLines.filter(
    (line) => !STAGED_STATUSES.has(line.slice(0, 2)),
  )
  if (unstagedChanges.length > 0) {
    fail(
      `These release drafts are not fully staged:\n${unstagedChanges.join('\n')}\nReview them and stage them with git add before tagging a release.`,
    )
  }

  return gitStatusLines.map((line) => line.slice(3))
}

function isReleasePath(filePath: string): boolean {
  return (
    PACKAGE_JSON_PATH_PATTERN.test(filePath) ||
    CHANGELOG_PATH_PATTERN.test(filePath)
  )
}

function findPackageVersionChanges(
  repoRoot: string,
  stagedPaths: string[],
): PackageVersionChange[] {
  return stagedPaths
    .filter((filePath) => PACKAGE_JSON_PATH_PATTERN.test(filePath))
    .flatMap((packageJsonPath) => {
      const stagedPackageJson = readPackageJson(repoRoot, `:${packageJsonPath}`)
      const headPackageJson = readHeadPackageJson(repoRoot, packageJsonPath)
      if (headPackageJson?.version === stagedPackageJson.version) {
        return []
      }
      return [
        {
          name: stagedPackageJson.name,
          version: stagedPackageJson.version,
          packageJsonPath,
        },
      ]
    })
}

function readHeadPackageJson(
  repoRoot: string,
  packageJsonPath: string,
): { name: string; version: string } | null {
  try {
    git(repoRoot, ['cat-file', '-e', `HEAD:${packageJsonPath}`])
  } catch {
    return null
  }
  return readPackageJson(repoRoot, `HEAD:${packageJsonPath}`)
}

function readPackageJson(
  repoRoot: string,
  objectName: string,
): { name: string; version: string } {
  const packageJson = JSON.parse(git(repoRoot, ['show', objectName]))
  if (
    typeof packageJson.name !== 'string' ||
    typeof packageJson.version !== 'string'
  ) {
    fail(`${objectName} has no name or version.`)
  }
  return { name: packageJson.name, version: packageJson.version }
}

function assertTagsMatchVersionChanges(
  releaseTags: ReleaseTag[],
  versionChanges: PackageVersionChange[],
): void {
  for (const releaseTag of releaseTags) {
    const versionChange = versionChanges.find(
      (change) => change.name === releaseTag.name,
    )
    if (versionChange == null) {
      fail(
        `${releaseTag.tag} names no package with a staged version change in packages/*/package.json.`,
      )
    }
    if (versionChange.version !== releaseTag.version) {
      fail(
        `${releaseTag.tag} does not match the staged version ${versionChange.version} in ${versionChange.packageJsonPath}.`,
      )
    }
  }

  const untaggedChanges = versionChanges.filter(
    (change) =>
      !releaseTags.some((releaseTag) => releaseTag.name === change.name),
  )
  if (untaggedChanges.length > 0) {
    fail(
      `These staged version changes have no tag in the args:\n${untaggedChanges
        .map((change) => `${change.name}@${change.version}`)
        .join('\n')}\nConfirm a tag for each one, or unstage it.`,
    )
  }
}

function assertTagsAreNew(repoRoot: string, releaseTags: ReleaseTag[]): void {
  for (const releaseTag of releaseTags) {
    if (tagExists(repoRoot, releaseTag.tag)) {
      fail(`Tag ${releaseTag.tag} already exists.`)
    }
  }
}

function tagExists(repoRoot: string, tag: string): boolean {
  try {
    git(repoRoot, ['rev-parse', '--quiet', '--verify', `refs/tags/${tag}`])
    return true
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 1) {
      return false
    }
    throw error
  }
}

function printNextSteps(
  commitMessage: string,
  releaseTags: ReleaseTag[],
): void {
  const tags = releaseTags.map((releaseTag) => releaseTag.tag)
  console.log(`\nCommitted "${commitMessage}" and tagged ${tags.join(', ')}.`)
  console.log('\nNext:')
  console.log('  Review the release commit: git show HEAD')
  console.log('  Push main and the tags:    pnpm push-release')
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function git(
  repoRoot: string,
  args: string[],
  stdio: 'pipe' | 'inherit' = 'pipe',
): string {
  const output = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio,
  })
  return output ?? ''
}
