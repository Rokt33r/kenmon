import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

type WorkspacePackage = {
  name: string
  version: string
  dir: string
}

type ReleaseTag = {
  tag: string
  name: string
  version: string
}

type Release = ReleaseTag & {
  packageDir: string
}

type PeerRaise = {
  release: Release
  peerName: string
  fromRange: string
  toRange: string
}

const RELEASE_BRANCH = 'main'
const PACKAGES_DIR = 'packages'
const CHANGELOG_PATH_PATTERN = /^packages\/([^/]+)\/CHANGELOG\.md$/
const STAGED_STATUSES = new Set(['M ', 'A '])
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/
const REQUIRES_LINE_PATTERN = /^\+- Requires (\S+@\S+) or later\.$/

main()

function main(): void {
  const repoRoot = process.cwd()

  const releaseTags = parseReleaseTags(process.argv.slice(2))
  assertOnReleaseBranch(repoRoot)
  const changelogDirs = findStagedChangelogDirs(repoRoot)
  const workspacePackages = readWorkspacePackages(repoRoot)
  const releases = matchTagsToChangelogs(
    releaseTags,
    changelogDirs,
    workspacePackages,
  )
  assertTagsAreNew(repoRoot, releases)
  const peerRaises = findPeerRaises(repoRoot, releases, workspacePackages)

  bumpVersions(repoRoot, releases)
  raisePeerRanges(repoRoot, peerRaises)
  const commitMessage = commitRelease(repoRoot, releases)
  tagRelease(repoRoot, releases)
  printNextSteps(commitMessage, releases, peerRaises)
}

function parseReleaseTags(args: string[]): ReleaseTag[] {
  if (args.length === 0) {
    fail('Pass the release tags, e.g. pnpm tag-release kenmon@1.0.0-pre.4')
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

function findStagedChangelogDirs(repoRoot: string): string[] {
  const gitStatusLines = git(repoRoot, [
    'status',
    '--porcelain',
    '--untracked-files=all',
  ])
    .split('\n')
    .filter((line) => line !== '')

  if (gitStatusLines.length === 0) {
    fail(
      'No staged changelog drafts. Run /release-prep, then review and stage its drafts.',
    )
  }

  const otherChanges = gitStatusLines.filter(
    (line) => !CHANGELOG_PATH_PATTERN.test(line.slice(3)),
  )
  if (otherChanges.length > 0) {
    fail(
      `The working tree has changes other than packages/*/CHANGELOG.md drafts:\n${otherChanges.join('\n')}\nCommit or discard them before tagging a release.`,
    )
  }

  const unstagedChanges = gitStatusLines.filter(
    (line) => !STAGED_STATUSES.has(line.slice(0, 2)),
  )
  if (unstagedChanges.length > 0) {
    fail(
      `These changelog drafts are not fully staged:\n${unstagedChanges.join('\n')}\nReview them and stage them with git add before tagging a release.`,
    )
  }

  return gitStatusLines.map(
    (line) => line.slice(3).match(CHANGELOG_PATH_PATTERN)![1],
  )
}

function readWorkspacePackages(repoRoot: string): WorkspacePackage[] {
  return fs.readdirSync(path.join(repoRoot, PACKAGES_DIR)).flatMap((dir) => {
    const packageJsonPath = path.join(
      repoRoot,
      PACKAGES_DIR,
      dir,
      'package.json',
    )
    if (!fs.existsSync(packageJsonPath)) {
      return []
    }
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    return [{ name: packageJson.name, version: packageJson.version, dir }]
  })
}

function matchTagsToChangelogs(
  releaseTags: ReleaseTag[],
  changelogDirs: string[],
  workspacePackages: WorkspacePackage[],
): Release[] {
  const releases = releaseTags.map((releaseTag) => {
    const workspacePackage = workspacePackages.find(
      (candidate) => candidate.name === releaseTag.name,
    )
    if (workspacePackage == null) {
      fail(`${releaseTag.tag} names no package in ${PACKAGES_DIR}/.`)
    }
    if (!changelogDirs.includes(workspacePackage.dir)) {
      fail(
        `${releaseTag.tag} has no staged changelog draft in ${PACKAGES_DIR}/${workspacePackage.dir}/CHANGELOG.md.`,
      )
    }
    if (workspacePackage.version === releaseTag.version) {
      fail(
        `${releaseTag.tag} is already the version in ${PACKAGES_DIR}/${workspacePackage.dir}/package.json.`,
      )
    }
    return {
      ...releaseTag,
      packageDir: `${PACKAGES_DIR}/${workspacePackage.dir}`,
    }
  })

  const untaggedDirs = changelogDirs.filter(
    (dir) =>
      !releases.some(
        (release) => release.packageDir === `${PACKAGES_DIR}/${dir}`,
      ),
  )
  if (untaggedDirs.length > 0) {
    fail(
      `These staged changelog drafts have no tag in the args:\n${untaggedDirs
        .map((dir) => `${PACKAGES_DIR}/${dir}/CHANGELOG.md`)
        .join('\n')}\nPass a tag for each one, or unstage it.`,
    )
  }

  return releases
}

function assertTagsAreNew(repoRoot: string, releases: Release[]): void {
  for (const release of releases) {
    if (tagExists(repoRoot, release.tag)) {
      fail(`Tag ${release.tag} already exists.`)
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

// A staged draft line `- Requires <name>@<version> or later.` raises the
// releasing package's peerDependencies.<name> to ^<version>. The draft is the
// only record of the raise, so /release-prep never edits package.json.
function findPeerRaises(
  repoRoot: string,
  releases: Release[],
  workspacePackages: WorkspacePackage[],
): PeerRaise[] {
  return releases.flatMap((release) => {
    const changelogPath = `${release.packageDir}/CHANGELOG.md`
    const requiredTags = git(repoRoot, [
      'diff',
      '--cached',
      '--',
      changelogPath,
    ])
      .split('\n')
      .map((line) => line.match(REQUIRES_LINE_PATTERN)?.[1])
      .filter((tag) => tag != null)

    const packageJson = readPackageJson(repoRoot, release.packageDir)
    return requiredTags.map((requiredTag) => {
      const required = parseReleaseTag(requiredTag)
      if (!workspacePackages.some((pkg) => pkg.name === required.name)) {
        fail(
          `${changelogPath} requires ${requiredTag}, but ${required.name} is not a package in ${PACKAGES_DIR}/.`,
        )
      }
      const fromRange = packageJson.peerDependencies?.[required.name]
      if (fromRange == null) {
        fail(
          `${changelogPath} requires ${requiredTag}, but ${release.packageDir}/package.json has no peerDependencies.${required.name}.`,
        )
      }
      const releasedTogether = releases.some(
        (other) => other.tag === requiredTag,
      )
      if (!releasedTogether && !tagExists(repoRoot, requiredTag)) {
        fail(
          `${changelogPath} requires ${requiredTag}, which is neither released by this run nor an existing tag.`,
        )
      }
      return {
        release,
        peerName: required.name,
        fromRange,
        toRange: `^${required.version}`,
      }
    })
  })
}

function raisePeerRanges(repoRoot: string, peerRaises: PeerRaise[]): void {
  for (const peerRaise of peerRaises) {
    const packageDir = peerRaise.release.packageDir
    const packageJson = readPackageJson(repoRoot, packageDir)
    packageJson.peerDependencies[peerRaise.peerName] = peerRaise.toRange
    fs.writeFileSync(
      path.join(repoRoot, packageDir, 'package.json'),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    )
  }
}

function readPackageJson(repoRoot: string, packageDir: string) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, packageDir, 'package.json'), 'utf8'),
  )
}

function bumpVersions(repoRoot: string, releases: Release[]): void {
  for (const release of releases) {
    execFileSync('npm', ['version', release.version, '--no-git-tag-version'], {
      cwd: path.join(repoRoot, release.packageDir),
      stdio: 'inherit',
    })
  }
}

function commitRelease(repoRoot: string, releases: Release[]): string {
  const packageJsonPaths = releases.map(
    (release) => `${release.packageDir}/package.json`,
  )
  git(repoRoot, ['add', '--', ...packageJsonPaths], 'inherit')

  const commitMessage = releases.map((release) => release.tag).join(', ')
  git(repoRoot, ['commit', '-m', commitMessage], 'inherit')
  return commitMessage
}

function tagRelease(repoRoot: string, releases: Release[]): void {
  for (const release of releases) {
    git(repoRoot, ['tag', '-a', release.tag, '-m', release.tag], 'inherit')
  }
}

function printNextSteps(
  commitMessage: string,
  releases: Release[],
  peerRaises: PeerRaise[],
): void {
  const tags = releases.map((release) => release.tag)
  console.log(`\nCommitted "${commitMessage}" and tagged ${tags.join(', ')}.`)
  for (const peerRaise of peerRaises) {
    console.log(
      `Raised ${peerRaise.release.name} peerDependencies.${peerRaise.peerName}: ${peerRaise.fromRange} -> ${peerRaise.toRange}`,
    )
  }
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
