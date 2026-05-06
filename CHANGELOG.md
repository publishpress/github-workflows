# Changelog

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

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
