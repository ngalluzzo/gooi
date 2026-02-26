# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for monorepo package versioning and per-package changelog generation.

## Local workflow

1. Create a changeset for releasable package changes:

```bash
bun run changeset
```

2. Commit the generated `.changeset/*.md` file with your feature/fix changes.

3. In CI, the release workflow will open or update a release PR.

4. Merging the release PR publishes packages and updates package changelogs.

## Commands

- `bun run changeset`
- `bun run changeset:status`
- `bun run version-packages`
- `bun run release`
