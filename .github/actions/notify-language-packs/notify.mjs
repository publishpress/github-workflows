export async function notifyLanguagePacks(github, context, env) {
  const { RELEASE_TAG: tag, TEXT_DOMAIN: domain, CATALOG_DIGEST: digest } = env;
  if (!tag || !/^[A-Za-z0-9_-]+$/.test(domain || '') || !/^[a-f0-9]{64}$/.test(digest || '')) {
    throw new Error('Invalid language archive publication details');
  }
  const { data: release } = await github.rest.repos.getReleaseByTag({ ...context.repo, tag });
  if (release.draft || release.prerelease) {
    throw new Error('Release is no longer published and stable');
  }
  const marker = `<!-- publishpress-locales:${domain}:${digest}:${context.runId}:${context.runAttempt} -->`;
  const notes = (release.body || '').replace(/\n*<!-- publishpress-locales:[^>]*-->/g, '').trimEnd();
  await github.rest.repos.updateRelease({
    ...context.repo, release_id: release.id, body: `${notes}\n\n${marker}`,
  });
}
