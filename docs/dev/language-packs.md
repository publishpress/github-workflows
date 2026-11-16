# Publish Language Packs

Call `.github/workflows/language-pack.yml@v3` after the stable Free or Pro release build, passing the edition's `text_domain` and `secrets: inherit`. The job requires `contents: write`.

The workflow attaches one `{text-domain}-locales.zip` to the existing published stable release. It reads committed PO, MO and JSON catalogs, omits incomplete locales and never uploads PHP catalogs. It does not compile new translations or create per-locale tags.

After uploading, it updates a hidden `publishpress-locales` marker in the existing release notes. This sends an edited-release webhook to the Package Server GitHub App after the archive exists. Visible release notes, tags and plugin ZIP bytes are preserved. Re-running the workflow sends another edit so failed imports can be retried.

Configure the product's Pro and Free repository fields on the WordPress site, and grant the matching Package Server App access to both repositories. The WordPress registry approves Free repositories only for translation imports, not Pro plugin distribution. EDD and Simba use the same Worker behavior.

`PACKAGE_SERVER_BASE_URL` and `PACKAGE_SERVER_SYNC_TOKEN` remain accepted for compatibility with older callers but are no longer used. Delivery uses the GitHub App webhook, not an admin sync request; no dashboard or minting token belongs in these Actions secrets.

Release this shared workflow update at `v3` before testing the updated Cart callers. A normal Free release workflow also deploys to WordPress.org; use a controlled staging fixture for publication tests.
