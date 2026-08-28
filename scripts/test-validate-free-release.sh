#!/usr/bin/env bash
# Negative and positive cases for validate-free-release, including the
# 4.10.4 / 4.10.4-beta.2 mismatch from publishpress-future#1697.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATE="${SCRIPT_DIR}/../.github/actions/validate-free-release/validate.sh"
PASSES=0
FAILURES=0

pass() {
    PASSES=$((PASSES + 1))
    echo "PASS  $1"
}

fail() {
    FAILURES=$((FAILURES + 1))
    echo "FAIL  $1 — $2"
}

expect_fail() {
    local name="$1"
    shift
    local output
    local code=0
    output="$("$@" 2>&1)" || code=$?
    if [[ "$code" -ne 0 ]]; then
        pass "$name"
        return
    fi
    fail "$name" "expected non-zero exit, got 0: ${output}"
}

expect_pass() {
    local name="$1"
    shift
    local output
    local code=0
    output="$("$@" 2>&1)" || code=$?
    if [[ "$code" -eq 0 ]]; then
        pass "$name"
        return
    fi
    fail "$name" "expected 0, got ${code}: ${output}"
}

run_validate() {
    env "$@" bash "$VALIDATE"
}

TMP="$(mktemp -d)"
cleanup() {
    rm -rf "$TMP"
}
trap cleanup EXIT

# Isolated git fixture: master has the stable commit; development has a later
# commit that is not on master (the 4.10.4 tag-on-development failure mode).
REPO="${TMP}/plugin"
git init -q -b master "$REPO"
git -C "$REPO" config user.email "test@example.com"
git -C "$REPO" config user.name "Release Guard Test"
echo "stable" >"${REPO}/README.md"
git -C "$REPO" add README.md
git -C "$REPO" commit -q -m "stable commit on master"
MASTER_SHA="$(git -C "$REPO" rev-parse HEAD)"
git -C "$REPO" checkout -q -b development
echo "beta" >"${REPO}/beta.txt"
git -C "$REPO" add beta.txt
git -C "$REPO" commit -q -m "beta commit only on development"
DEV_SHA="$(git -C "$REPO" rev-parse HEAD)"

# Tag regex: prerelease GitHub tag must not deploy as a stable release.
expect_fail "prerelease tag is rejected" \
    run_validate \
    RELEASE_TAG="4.10.4-beta.2" \
    BUILT_VERSION="4.10.4-beta.2" \
    STABLE_BRANCH="master" \
    REPO_ROOT="$REPO"

expect_fail "v-prefixed prerelease tag is rejected" \
    run_validate \
    RELEASE_TAG="v4.10.4-beta.2" \
    BUILT_VERSION="4.10.4-beta.2" \
    STABLE_BRANCH="master" \
    REPO_ROOT="$REPO"

# Version mismatch modeled on issue #1697.
git -C "$REPO" checkout -q "$DEV_SHA"
expect_fail "tag 4.10.4 with built 4.10.4-beta.2 is rejected" \
    run_validate \
    RELEASE_TAG="4.10.4" \
    BUILT_VERSION="4.10.4-beta.2" \
    STABLE_BRANCH="master" \
    REPO_ROOT="$REPO"

# Matching versions, but commit is only on development.
expect_fail "development commit is not on master" \
    run_validate \
    RELEASE_TAG="4.10.4" \
    BUILT_VERSION="4.10.4" \
    STABLE_BRANCH="master" \
    REPO_ROOT="$REPO"

# Happy path: tag commit is master HEAD and versions match.
git -C "$REPO" checkout -q "$MASTER_SHA"
expect_pass "stable tag on master with matching version" \
    run_validate \
    RELEASE_TAG="4.10.5" \
    BUILT_VERSION="4.10.5" \
    STABLE_BRANCH="master" \
    REPO_ROOT="$REPO"

# Revisions and other plugins tag GitHub releases as vX.Y.Z.
expect_pass "v-prefixed stable tag matches unprefixed plugin version" \
    run_validate \
    RELEASE_TAG="v4.10.5" \
    BUILT_VERSION="4.10.5" \
    STABLE_BRANCH="master" \
    REPO_ROOT="$REPO"

# Missing env.
expect_fail "missing RELEASE_TAG" \
    run_validate \
    BUILT_VERSION="4.10.5" \
    REPO_ROOT="$REPO"

expect_fail "missing BUILT_VERSION" \
    run_validate \
    RELEASE_TAG="4.10.5" \
    REPO_ROOT="$REPO"

echo
echo "${PASSES} passed, ${FAILURES} failed"
if [[ "$FAILURES" -gt 0 ]]; then
    exit 1
fi
