/**
 * Detect whether the current page is a GitHub (Enterprise) issue or PR page.
 *
 * We check for GitHub-specific DOM markers rather than relying solely on the
 * URL pattern from manifest.json (which may also match non-GitHub URLs like Jira).
 */
export function isGitHubIssuePage(): boolean {
  // GitHub renders a <meta name="hostname"> or a specific data attribute
  const hostnameMeta = document.querySelector<HTMLMetaElement>('meta[name="hostname"]');
  if (hostnameMeta) return true;

  // GitHub Enterprise pages have a .repository-content or .js-issues-results container
  if (
    document.querySelector('.repository-content') ||
    document.querySelector('.js-issues-results') ||
    document.querySelector('[data-turbo-frame="repo-content"]')
  ) {
    return true;
  }

  // Fallback: check the page URL for classic GitHub patterns
  return /\/(issues|pull)\/\d+/.test(location.pathname);
}

/**
 * Return the filename portion of an image URL.
 * Falls back to the last URL segment.
 */
export function filenameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || 'image';
  } catch {
    return 'image';
  }
}
