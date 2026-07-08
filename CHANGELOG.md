# Changelog

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

[3.4.0] - 08 July, 2026

- Added a reusable changelog sync workflow.

[3.3.0] - 11 Jun, 2026

- Added: Introduced a Composer dependency security audit workflow for the `lib` directory.

[3.2.1] - 09 Jun, 2026

- Changed: Simplify the release-pro workflow, temporarily, removing any write operation since the ZIP package is actually uploaded by hand on the release for now.

[3.2.0] - 29 May, 2026

- Added: Introduced a reusable Dependabot triage workflow that dismisses non-critical development-scope alerts while keeping runtime, critical, and allowlisted packages open.

[3.1.6] - 27 May, 2026

- Fixed: Updated `deploy-free-assets.yml` to create the root `.env` file before running Composer so dev-workspace hooks can read plugin metadata during asset publishing.

[3.1.5] - 27 May, 2026

- Fixed: Updated `deploy-free.yml` to use `extra.plugin-folder` as the WordPress.org SVN slug while keeping the build directory aligned with the plugin folder.
- Fixed: Updated `deploy-free-assets.yml` to use `extra.plugin-folder` as the WordPress.org SVN slug.

[3.1.4] - 21 May, 2026

- Fixed: Updated the `deploy-free-assets.yml` workflow to avoid installing unnecessary dependencies during the asset publishing process.

[3.1.3] - 05 May, 2026

- Fixed: Removed the unnecessary pack:dir step from the integration tests workflow for improved clarity and efficiency.

[3.1.2] - 05 May, 2026

- Fixed: Resolved issue where the build:dir command was not found.

[3.1.1] - 05 May, 2026

- Fixed: Updated integration tests workflow to dynamically use plugin metadata instead of hardcoded values.
- Fixed: Added a step in the tests workflow to build Codeception support classes.

[3.1.0] - 05 May, 2026

- Added: Introduced a dedicated integration tests workflow.

[3.0.1] - 05 May, 2026

- Changed: Enabled strict Composer validation for improved reliability on all the workflows.
- Changed: Improved dependency installation by adjusting Composer flags on all the workflows.

[3.0.0] - 05 May, 2026

- Changed: Renamed workflow files for clarity and consistency.
- Changed: Added timeouts to workflow jobs to prevent hangs.
- Changed: Secured setup by explicitly requiring Composer v2.
- Changed: Enabled strict Composer validation for improved reliability on the code-standards.yml workflow.
- Changed: Improved dependency installation by adjusting Composer flags on the code-standards.yml workflow.

[2.0.0] - 28 April, 2026

- Changed: Change the actions to run on `ubuntu-latest` instead of custom runners.

[1.0.0] - 27 April, 2026

- First version, based on custom runners.
