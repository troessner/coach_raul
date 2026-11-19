/**
 * Response headers for the pages that render per request.
 *
 * public/_headers only reaches static asset responses, so a Worker-rendered
 * page inherits none of it. Every per-request page has to set these itself or
 * it is indexable and framable while the prerendered pages around it are not —
 * and it has to key its cache on the draft cookie, or Cloudflare stores one
 * body per URL and a previewing browser gets whichever it lands on.
 *
 * One function rather than the same block copied into each page: the noindex
 * below comes off at launch, and it should come off everywhere at once.
 */

/** How long Cloudflare may serve a published page, and how long it may keep serving a stale one. */
export interface CachePolicy {
	maxAge: number;
	staleWhileRevalidate: number;
}

/**
 * A minute at the edge, so a burst of traffic is one Sanity query rather than
 * thousands. A publish shows up within ~60s.
 */
export const CONTENT_CACHE: CachePolicy = { maxAge: 60, staleWhileRevalidate: 600 };

/**
 * The legal pages change roughly never, and § 5 DDG wants the Impressum
 * *ständig verfügbar*. The long stale window is the point: if Sanity is
 * unreachable, Cloudflare keeps serving the last good copy for a day instead
 * of turning a Pflichtangabe into a 500.
 */
export const LEGAL_CACHE: CachePolicy = { maxAge: 300, staleWhileRevalidate: 86400 };

export const setPageHeaders = (headers: Headers, preview: boolean, cache: CachePolicy): void => {
	// TODO: drop this at launch, together with the site-wide one in
	// public/_headers. Until the placeholder content is gone, nothing here may
	// be indexed.
	headers.set('X-Robots-Tag', 'noindex');
	// SAMEORIGIN, not DENY: the Studio's Presentation tool previews the site by
	// iframing it from /studio, and DENY blanks that pane.
	headers.set('X-Frame-Options', 'SAMEORIGIN');
	// The body depends on the draft cookie, so the cache has to key on it.
	headers.set('Vary', 'Cookie');

	if (preview) {
		// Unpublished content must never be cached anywhere, by anyone.
		headers.set('Cache-Control', 'private, no-store');
	} else {
		headers.set(
			'Cache-Control',
			`public, s-maxage=${cache.maxAge}, stale-while-revalidate=${cache.staleWhileRevalidate}`,
		);
	}
};
