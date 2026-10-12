# github-workflows

Reusable GitHub Actions workflows for PublishPress plugin repositories.

## Available workflows

- `.github/workflows/unit-tests.yml`: Runs PHPUnit tests.
- `.github/workflows/code-standards.yml`: Runs PHP compatibility and lint checks.
- `.github/workflows/code-complexity.yml`: Runs PHP code complexity analysis with PHPMD.
- `.github/workflows/dependabot-triage.yml`: Auto-dismisses low-risk development-scope Dependabot alerts.
- `.github/workflows/issue-types.yml`: Uses JEV to set an issue type on open issues that have none.
- `.github/workflows/deploy-free.yml`: Builds and deploys free plugin releases to WordPress.org and uploads release assets to GitHub.
- `.github/workflows/deploy-free-assets.yml`: Updates WordPress.org plugin assets/readme.
- `.github/workflows/deploy-pro.yml`: Builds pro plugin packages and uploads release assets to GitHub.
- `.github/workflows/sync-changelog.yml`: Notifies a WordPress changelog bridge endpoint after a release is published.
- `.github/workflows/build-zip.yml`: Builds the plugin zip from any branch, tag, commit, or pull request and attaches it to the run, for hotfix builds.

## Usage

Create a workflow file in your repository under `.github/workflows/` and call one of these reusable workflows.

Security recommendation: always pin reusable workflows to a commit SHA, not a branch name such as `main`.

### Unit tests example

```yaml
name: Unit Tests

on:
  pull_request:
    branches: [ master, development ]
  push:
    branches: [ master, development ]

permissions:
  contents: read

jobs:
  unit_tests:
    uses: publishpress/github-workflows/.github/workflows/unit-tests.yml@<commit-sha>
```

### Code standards example

```yaml
name: Code Standards

on:
  pull_request:
    branches: [ master, development ]
  push:
    branches: [ master, development ]

permissions:
  contents: read

jobs:
  code_standards:
    uses: publishpress/github-workflows/.github/workflows/code-standards.yml@<commit-sha>
```

### Code complexity example

```yaml
name: Code Complexity

on:
  pull_request:
    branches: [ master, development ]
  push:
    branches: [ master, development ]

permissions:
  contents: read

jobs:
  code_complexity:
    uses: publishpress/github-workflows/.github/workflows/code-complexity.yml@<commit-sha>
```

### Dependabot triage example

```yaml
name: Dependabot Alert Triage

on:
  schedule:
    - cron: "0 0 * * 1"
  workflow_dispatch:
    inputs:
      dry_run:
        description: Log matching alerts without dismissing them
        required: false
        type: boolean
        default: false

permissions:
  contents: read
  security-events: write

jobs:
  dependabot_triage:
    name: Auto-dismiss dev-only Dependabot alerts
    uses: publishpress/github-workflows/.github/workflows/dependabot-triage.yml@<commit-sha>
    with:
      dry_run: ${{ inputs.dry_run || false }}
    secrets: inherit
```

The weekly schedule runs on Mondays at 00:00 UTC. Use the manual `workflow_dispatch` trigger with `dry_run: true` to verify which alerts would be dismissed before running it for real.

The workflow uses the caller repository's `DEPENDABOT_ALERTS_TOKEN` secret when it is available, then falls back to `GITHUB_TOKEN`. For centralized token management, add `DEPENDABOT_ALERTS_TOKEN` as an organization secret and allow access to the plugin repositories that should use this workflow. The token must have Dependabot alerts read/write access.

### Issue types example

Each caller repository owns the schedule. The reusable workflow classifies open issues that have no type and leaves pull requests, typed issues, and closed issues alone. It reads the repository's enabled issue types and asks JEV (`jev-latest`) to pick one. A type is applied only when confidence is at least `min_confidence` (default `0.8`). Each run classifies the oldest untyped issues, up to `max_issues` (default `50`).

```yaml
name: Classify issue types

on:
  schedule:
    - cron: "0 5 * * *"
  workflow_dispatch:
    inputs:
      dry_run:
        description: Log chosen types without applying them
        required: false
        type: boolean
        default: false

permissions:
  contents: read
  issues: write

jobs:
  issue_types:
    name: Apply issue types
    uses: publishpress/github-workflows/.github/workflows/issue-types.yml@<commit-sha>
    with:
      dry_run: ${{ inputs.dry_run || false }}
    secrets: inherit
```

Create an organization secret named `TYPESAFE_API_KEY` and grant it to the repositories that call this workflow. `secrets: inherit` passes that secret into the reusable workflow.

### Deploy free plugin example

```yaml
name: Deploy Free Plugin

on:
  release:
    types: [released]

permissions:
  contents: write

jobs:
  deploy_free:
    uses: publishpress/github-workflows/.github/workflows/deploy-free.yml@<commit-sha>
    with:
      stable_branch: master
    secrets: inherit
```

Required repository secrets for WordPress.org deploy:

- `SVN_USERNAME`
- `SVN_PASSWORD`

The workflow fails before uploading to GitHub or WordPress.org unless all of the following are true:

- The GitHub release tag is a stable `x.y.z` or `vx.y.z` version (no `-beta` / `-rc` / `-alpha` suffix)
- The tagged commit is contained in `stable_branch` (`master` by default)
- The built plugin `Version` header equals the release tag without a leading `v`

Optional `workflow_call` input:

- `stable_branch`: branch that must contain the tagged commit (default `master`)

### Deploy pro plugin example

```yaml
name: Deploy Pro Plugin

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  deploy_pro:
    uses: publishpress/github-workflows/.github/workflows/deploy-pro.yml@<commit-sha>
    secrets: inherit
```

### Deploy free plugin assets example

```yaml
name: Deploy Free Plugin Assets

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy_assets:
    uses: publishpress/github-workflows/.github/workflows/deploy-free-assets.yml@<commit-sha>
    secrets: inherit
```

### Sync changelog

Use this when a release should notify the configured WordPress changelog bridge sites. The workflow sends the repository name only; Changelog Bridge resolves the latest GitHub release changelog and falls back to the default branch when needed. Endpoint errors are reported as GitHub Actions warnings and do not fail the release workflow.

```yaml
name: Sync Changelog

on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  sync_changelog:
    uses: publishpress/github-workflows/.github/workflows/sync-changelog.yml@<commit-sha>
    secrets: inherit
```

Supported repository or organization secrets:

- `CHANGELOG_SYNC_URL_STAGING`: Staging WordPress REST endpoint, for example `https://staging.example.com/wp-json/publishpress-changelog/v1/sync`.
- `CHANGELOG_SYNC_SECRET_STAGING`: Shared HMAC secret configured on the staging WordPress site.
- `CHANGELOG_SYNC_URL_PRODUCTION`: Production WordPress REST endpoint, for example `https://example.com/wp-json/publishpress-changelog/v1/sync`.
- `CHANGELOG_SYNC_SECRET_PRODUCTION`: Shared HMAC secret configured on the production WordPress site.

### Build plugin zip

Use this to hand a customer a hotfix build from a pull request without building it locally. It runs `composer build` (the dev-workspace package, or the older in-repository `dev-workspace/` folder, detected automatically), renames the zip to `<plugin>-<version>-<ref>-<sha>.zip`, and uploads it as the run's artifact without an extra zip layer. The folder inside the zip is unchanged, so it installs over the existing plugin.

Free plugin:

```yaml
name: Build plugin zip

on:
  workflow_dispatch:
    inputs:
      ref:
        description: Pull request number, branch, tag, or commit SHA to build. Leave empty to build the branch selected above.
        required: false
        type: string
  pull_request:
    types: [labeled]

permissions:
  contents: read

jobs:
  build_zip:
    uses: publishpress/github-workflows/.github/workflows/build-zip.yml@<commit-sha>
    with:
      ref: ${{ inputs.ref }}
```

Pro plugin, which can also bundle an unreleased free plugin branch in place of the version in `lib/composer.lock`:

```yaml
name: Build plugin zip

on:
  workflow_dispatch:
    inputs:
      ref:
        description: Pull request number, branch, tag, or commit SHA to build. Leave empty to build the branch selected above.
        required: false
        type: string
      free_ref:
        description: Optional. Free plugin branch or pull request number to bundle instead of the version in lib/composer.lock.
        required: false
        type: string
  pull_request:
    types: [labeled]

permissions:
  contents: read

jobs:
  build_zip:
    uses: publishpress/github-workflows/.github/workflows/build-zip.yml@<commit-sha>
    with:
      ref: ${{ inputs.ref }}
      free-package: publishpress/publishpress-checklists
      free-ref: ${{ inputs.free_ref }}
```

Adding the `build-zip` label to a pull request builds its head commit. On other `pull_request` events the job is skipped.

Optional `workflow_call` inputs:

- `ref`: pull request number, branch, tag, or commit SHA (default: the ref the caller ran on)
- `php-version`: PHP version for the root `composer install` (default `8.3`)
- `free-package`: Composer package of the bundled free plugin (Pro plugins)
- `free-repo`: GitHub repository of the free plugin, when it differs from `free-package`
- `free-ref`: free plugin branch or pull request number to bundle
- `retention-days`: days to keep the artifact (default `14`)

No secrets are needed. A free pull request from a fork cannot be bundled, because Composer only sees branches in the free plugin's repository.
