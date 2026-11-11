#!/usr/bin/env bash
set -euo pipefail
umask 077

case "${GITHUB_REPOSITORY_OWNER,,}" in
    publishpress)
        expected_id=publishpress-2026
        public_key=MCowBQYDK2VwAyEA3lrm9KcDTOt0Bapj04Wav/eaU7YaHsVwBd4MUHMDx18=
        ;;
    metaslider)
        expected_id=metaslider-2026
        public_key=MCowBQYDK2VwAyEAI63LA0oHn3BjOUaj2wcXKLaCX6AkDBi3FxaKQhtEjZ4=
        ;;
    *) echo '::error::No signing public key is pinned for this organization.'; exit 1 ;;
esac

key_id="${KEY_ID:-$expected_id}"
if [[ "$key_id" != "$expected_id" || -z "${PRIVATE_KEY:-}" || ! -s "$PACKAGE_PATH" ]]; then
    echo '::error::Signing requires the organization key ID, PLUGIN_ZIP_ED25519_PRIVATE_KEY, and a non-empty ZIP.'
    exit 1
fi

temp_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/package-signing.XXXXXX")"
trap 'rm -rf -- "$temp_dir"' EXIT
printf '%s\n' "$PRIVATE_KEY" > "$temp_dir/private.pem"
unset PRIVATE_KEY
printf '%s' "$public_key" | base64 --decode > "$temp_dir/public.der"
openssl pkey -pubin -inform DER -in "$temp_dir/public.der" -out "$temp_dir/public.pem"
openssl pkeyutl -sign -rawin -inkey "$temp_dir/private.pem" -in "$PACKAGE_PATH" -out "$temp_dir/signature.bin"
[[ "$(wc -c < "$temp_dir/signature.bin")" -eq 64 ]]
openssl pkeyutl -verify -rawin -pubin -inkey "$temp_dir/public.pem" -in "$PACKAGE_PATH" -sigfile "$temp_dir/signature.bin"
printf 'v1 %s %s\n' "$key_id" "$(base64 -w 0 "$temp_dir/signature.bin")" > "${PACKAGE_PATH}.sig"
printf 'path=%s.sig\npublic-key=%s\n' "$PACKAGE_PATH" "$public_key" >> "$GITHUB_OUTPUT"
