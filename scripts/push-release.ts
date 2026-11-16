import { execFileSync } from 'node:child_process'

const REMOTE = 'origin'
const RELEASE_BRANCH = 'main'
const TAG_REF_PREFIX = 'refs/tags/'

main()

function main(): void {
  const repoRoot = process.cwd()

  assertOnReleaseBranch(repoRoot)
  git(repoRoot, ['push', REMOTE, RELEASE_BRANCH], 'inherit')

  const remoteTags = new Set(listRemoteTags(repoRoot))
  const pendingTags = listLocalTagsOldestFirst(repoRoot).filter(
    (tag) => !remoteTags.has(tag),
  )

  if (pendingTags.length === 0) {
    console.log('\nNo tags to push.')
    return
  }

  for (const tag of pendingTags) {
    console.log(`\nPushing ${tag}`)
    git(repoRoot, ['push', REMOTE, `${TAG_REF_PREFIX}${tag}`], 'inherit')
  }

  console.log(`\nPushed ${pendingTags.length} tag(s) one at a time.`)
}

function assertOnReleaseBranch(repoRoot: string): void {
  const branch = git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
  if (branch !== RELEASE_BRANCH) {
    console.error(
      `Releases are pushed only from the ${RELEASE_BRANCH} branch (current: ${branch}).`,
    )
    process.exit(1)
  }
}

function listLocalTagsOldestFirst(repoRoot: string): string[] {
  return git(repoRoot, [
    'for-each-ref',
    '--sort=creatordate',
    '--format=%(refname)',
    TAG_REF_PREFIX,
  ])
    .split('\n')
    .filter((ref) => ref !== '')
    .map((ref) => ref.slice(TAG_REF_PREFIX.length))
}

function listRemoteTags(repoRoot: string): string[] {
  return git(repoRoot, ['ls-remote', '--tags', REMOTE])
    .split('\n')
    .map((line) => line.split('\t')[1])
    .filter((ref) => ref != null && !ref.endsWith('^{}'))
    .map((ref) => ref.slice(TAG_REF_PREFIX.length))
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
