# github-workflows
Workflow for checking PHP min version


## Using this workflow:

Create a php5-support.yml file in the `.github/workflows` dir on the repository:

```YAML
name: PHP v5 Support

on:
  push:
    branches: [ master, develop ]
  pull_request:
    branches: [ master, develop ]

permissions:
  contents: read

jobs:
  php5_check:
    uses: publishpress/github-workflows/.github/workflows/php5-support.yml@main

```
