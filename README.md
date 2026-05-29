# github-workflows

Reusable GitHub Actions workflows for PublishPress plugin repositories.

## Available workflows

- `.github/workflows/unit-tests.yml`: Runs PHPUnit tests.
- `.github/workflows/code-standards.yml`: Runs PHP compatibility and lint checks.
- `.github/workflows/code-complexity.yml`: Runs PHP code complexity analysis with PHPMD.
- `.github/workflows/dependabot-triage.yml`: Auto-dismisses low-risk development-scope Dependabot alerts.
- `.github/workflows/deploy-free.yml`: Builds and deploys free plugin releases to WordPress.org and uploads release assets to GitHub.
- `.github/workflows/deploy-free-assets.yml`: Updates WordPress.org plugin assets/readme.
- `.github/workflows/deploy-pro.yml`: Builds pro plugin packages and uploads release assets to GitHub.

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
    name: Auto dismiss dev only Dependabot alerts
    uses: publishpress/github-workflows/.github/workflows/dependabot-triage.yml@<commit-sha>
    with:
      dry_run: ${{ inputs.dry_run || false }}
    secrets:
      DEPENDABOT_ALERTS_TOKEN: ${{ secrets.DEPENDABOT_ALERTS_TOKEN }}
```

The weekly schedule runs on Mondays at 00:00 UTC. Use the manual `workflow_dispatch` trigger with `dry_run: true` to verify which alerts would be dismissed before running it for real.

By default, the workflow uses the caller repository's `GITHUB_TOKEN` with the permissions declared above. If that token cannot manage Dependabot alerts for a repository, add a `DEPENDABOT_ALERTS_TOKEN` repository secret from a PAT or GitHub App token with Dependabot alerts read/write access. The workflow uses that secret when it is available.

### Deploy free plugin example

```yaml
name: Deploy Free Plugin

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  deploy_free:
    uses: publishpress/github-workflows/.github/workflows/deploy-free.yml@<commit-sha>
    secrets: inherit
```

Required repository secrets for WordPress.org deploy:

- `SVN_USERNAME`
- `SVN_PASSWORD`

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
