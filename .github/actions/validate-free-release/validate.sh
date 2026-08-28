#!/usr/bin/env bash
# Fail a WordPress.org free-plugin deploy unless the GitHub release tag is a
# stable x.y.z version, the tag commit is on the stable branch, and the built
# plugin version matches the tag. This is the 4.10.4-beta.2 / #1697 guard.
#
# Env:
#   RELEASE_TAG      GitHub release tag (required)
#   BUILT_VERSION    Plugin Version header from the built package (required)
#   STABLE_BRANCH    Branch that must contain the tag commit (default: master)
#   REPO_ROOT        Git repository to inspect (default: cwd)

set -euo pipefail

RELEASE_TAG="${RELEASE_TAG:-}"
BUILT_VERSION="${BUILT_VERSION:-}"
STABLE_BRANCH="${STABLE_BRANCH:-master}"
REPO_ROOT="${REPO_ROOT:-.}"

fail() {
    echo "::error::$1" >&2
    echo "ERROR: $1" >&2
    exit 1
}

if [[ -z "$RELEASE_TAG" ]]; then
    fail "RELEASE_TAG is required"
fi

if [[ -z "$BUILT_VERSION" ]]; then
    fail "BUILT_VERSION is required"
fi

# GitHub tags are often vX.Y.Z; the WordPress Version header is X.Y.Z.
STABLE_VERSION="${RELEASE_TAG#v}"
STABLE_VERSION="${STABLE_VERSION#V}"

if [[ ! "$STABLE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    fail "Release tag '${RELEASE_TAG}' must be a stable x.y.z version (optional v prefix)"
fi

if [[ "$BUILT_VERSION" != "$STABLE_VERSION" ]]; then
    fail "Built plugin version '${BUILT_VERSION}' does not match release tag '${RELEASE_TAG}'"
fi

if [[ ! -d "$REPO_ROOT" ]]; then
    fail "REPO_ROOT is not a directory: ${REPO_ROOT}"
fi

cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    fail "REPO_ROOT is not a git repository: ${REPO_ROOT}"
fi

if git remote get-url origin >/dev/null 2>&1; then
    git fetch --no-tags origin "$STABLE_BRANCH"
fi

STABLE_REF=""
if git rev-parse --verify -q "origin/${STABLE_BRANCH}^{commit}" >/dev/null; then
    STABLE_REF="origin/${STABLE_BRANCH}"
elif git rev-parse --verify -q "${STABLE_BRANCH}^{commit}" >/dev/null; then
    STABLE_REF="${STABLE_BRANCH}"
else
    fail "Stable branch '${STABLE_BRANCH}' was not found"
fi

HEAD_SHA="$(git rev-parse HEAD)"
if ! git merge-base --is-ancestor HEAD "$STABLE_REF"; then
    fail "Release commit ${HEAD_SHA} is not on ${STABLE_BRANCH} (${STABLE_REF})"
fi

echo "Release tag ${RELEASE_TAG} matches built version and is contained in ${STABLE_REF}"
