# Signed Plugin Builds

## Signing Credential

Add `PLUGIN_ZIP_ED25519_PRIVATE_KEY` as an Actions secret containing the entire PKCS8 PEM Ed25519 private key. PublishPress uses an organization secret; MetaSlider uses repository secrets where organization sharing is unavailable. Callers use `secrets: inherit`. Never put the private key into repositories or the dev-workspace image.

The signing action pins public keys for `publishpress-2026` and `metaslider-2026`, selecting by repository organization. It signs on the runner and verifies against the pinned key before uploading. A mismatched private key fails. The `.sig` file is exactly `v1 <key-id> <base64>` plus a newline, signing the raw ZIP bytes. No signature is inserted into the ZIP.

## Stable Builds

`deploy-free.yml` and `deploy-pro.yml` run `composer build`, sign its ZIP, and upload the ZIP and `.sig` using `--clobber`. When a stable tag build has no GitHub release yet, the workflow creates it using the existing tag; it never moves or creates the tag. WordPress.org receives the directory from the same free-plugin build. Neither workflow sets `PP_SKIP_RELEASE_CHECK`, calls `composer build:all`, or deploys pre-release events.

The Pro workflow still accepts `sign_package` for existing callers, but it defaults to true and cannot be false. `package_signing_key_id` is optional; otherwise the organization key is selected.

## Signed Test Builds

Use the [signed pre-release caller example](README.md#signed-pre-release-build-example) in the README.

Publish the dev-workspace release supporting `PP_SKIP_RELEASE_CHECK=1` and update plugin Composer lock files before running with skipped checks. Old locked versions do not recognize the flag.

Both skips default to true. With `skip_translations: false`, the workflow runs `composer translate:compile`; otherwise it packages the catalogs in the tree. `skip_release_checks: true` sets `PP_SKIP_RELEASE_CHECK=1` in the process and container environment. Signing cannot be skipped.

The run uploads only the ZIP and `.sig` as Actions artifacts. Its summary links the artifacts and prints an OpenSSL verification command. It creates no tag, release, release asset, WordPress.org deployment, or Hub install. Fork pull requests are rejected; sign only trusted maintainer-selected code, never automatic untrusted pull requests.

## Existing Releases

`sign-existing-release.yml` accepts `release_tag`, downloads the one non-empty versioned ZIP, checks its GitHub digest, signs it, and uploads only the `.sig`. It never rebuilds or replaces the ZIP. Package Server sync must then confirm these bytes match the immutable R2 object. Stop enrollment if they differ.

Use the [existing-release signing caller example](README.md#sign-an-existing-release-example) in the README.

Open **Actions > Sign an existing release without rebuilding > Run workflow**, enter the exact tag, and confirm the matching `.sig` appears beside the unchanged ZIP on the release page.

`build-zip.yml` remains an unsigned support-hotfix workflow. Package Server and Hub enforcement are separate opt-in changes after signed assets and historical metadata are ready. Publish the signing action and workflows together before moving `v3` and updating callers.
