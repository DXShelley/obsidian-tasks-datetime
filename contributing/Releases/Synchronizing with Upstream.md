# Synchronizing with Upstream

Tasks Datetime is independently maintained, but it periodically incorporates
changes from the upstream [Obsidian Tasks project](https://github.com/obsidian-tasks-group/obsidian-tasks).
This note describes how maintainers should perform that work without losing
changes made in this repository.

## One-time setup

Keep this repository as `origin` and add the original project as a read-only
remote named `upstream`:

```bash
git remote add upstream https://github.com/obsidian-tasks-group/obsidian-tasks.git
git fetch upstream --tags
```

Check the configured remotes with:

```bash
git remote -v
```

Do not push to `upstream`.

## Synchronization procedure

1. Start from the `dev` branch with a clean working tree. Commit or otherwise
   preserve all local work first; do not merge upstream code over uncommitted
   changes.
2. Fetch the upstream branches and tags:

   ```bash
   git fetch upstream --tags
   ```

3. Create a synchronization branch from `dev`, named for the upstream version
   being adopted:

   ```bash
   git switch dev
   git pull --ff-only origin dev
   git switch -c sync/upstream-<version>
   ```

4. Merge the upstream default branch:

   ```bash
   git merge upstream/main
   ```

   Resolve conflicts by retaining intentional Tasks Datetime behavior, then
   record the resolution in the merge commit. Prefer a merge over rebasing a
   branch that has already been shared, as the merge preserves the relationship
   to the upstream commit history.

5. Run the normal verification suite and inspect the plugin artifacts:

   ```bash
   yarn test
   yarn build
   git diff --check
   ```

6. Open or review a pull request from the synchronization branch into `dev`.
   Merge it only after tests and manual plugin checks pass. Push only to
   `origin`.

Use `git log --oneline dev..upstream/main` to inspect upstream commits before
merging. After the merge, record the incorporated upstream tag and merge commit
in the release notes or pull request description.

## Version policy

The plugin ID is unique (`obsidian-tasks-datetime`), so its releases are
separate from upstream releases. The major and minor version numbers must match
the upstream compatibility baseline; the patch version is maintained
independently by Tasks Datetime.

- When the adopted upstream version is in the `8.2.x` series, release Tasks
  Datetime as `8.2.0`, then increment its patch version independently as
  `8.2.1`, `8.2.2`, and so on.
- Do not try to match the upstream patch version. An upstream `8.2.3` release
  can therefore be incorporated in a Tasks Datetime `8.2.1` release.
- When adopting an upstream `8.3.x` release, start a new Tasks Datetime series
  at `8.3.0`.

The value must be a valid Semantic Version. Update the same value in both
`package.json` and `manifest.json`, and create a matching Git tag for every
release:

```bash
git tag 8.2.1
git push origin dev --tags
```

The release workflow is tag-triggered, so never create a release tag until the
tag matches the version in both files and the release artifacts have been
verified. A version may have the same tag name as an upstream version because
the repositories are separate, but it always identifies a Tasks Datetime
release.

## Release checklist

- Confirm `git status` is clean and the release commit is on `dev`.
- Confirm the upstream base tag and merge commit are recorded.
- Confirm `package.json`, `manifest.json`, and the release tag use the same
  version.
- Run tests and build the release artifact from the tagged commit.
- Push `dev` and the tag to `origin`; do not push or tag the upstream remote.
