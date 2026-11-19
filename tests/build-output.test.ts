import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Asserts on the real built files rather than on source, so these catch the
 * failures that actually reach visitors: a dropped heading, a missing header
 * file, a canonical URL that stopped being absolute.
 *
 * Only the prerendered output is here, which is now the 404 and the files
 * Cloudflare reads. The home page and the two legal pages all render per
 * request and have no file in dist/ — they go through Astro's container
 * instead, in tests/home-page.test.ts and tests/legal-pages.test.ts.
 *
 * Requires `npm run build` first — `npm run ci` and the GitHub workflow both
 * build before they test.
 */
const read = (page: string) => {
	const file = fileURLToPath(new URL(`../dist/client/${page}`, import.meta.url));

	if (!existsSync(file)) {
		throw new Error(`No build output at ${file}. Run "npm run build" before "npm test".`);
	}

	return readFileSync(file, 'utf8');
};

const notFound = read('404.html');

describe('the legal pages are no longer static', () => {
	it('leaves no stale prerendered copy behind in dist/', () => {
		// They read the operator document per request now. A leftover file from an
		// older build would be served by Cloudflare in preference to the Worker,
		// which is how an Impressum silently goes back to showing the old address.
		for (const page of ['impressum/index.html', 'datenschutz/index.html']) {
			const file = fileURLToPath(new URL(`../dist/client/${page}`, import.meta.url));
			expect(existsSync(file)).toBe(false);
		}
	});
});

describe('every prerendered page', () => {
	it('declares an absolute canonical URL', () => {
		// Relative values here are ignored. They have to come off Astro.site, so
		// this also fails if `site` ever drops out of astro.config.mjs.
		expect(notFound).toMatch(/<link rel="canonical" href="https:\/\/[^"]+"/);
	});

	it('loads no font or asset from a Google domain', () => {
		// Remote Google Fonts hand every visitor's IP to Google, which is a standing
		// Abmahnung risk for a German site. The font is self-hosted — keep it that way.
		expect(notFound).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
	});
});

describe('deploy config', () => {
	it('builds a 404 page for Cloudflare to serve', () => {
		expect(notFound).toContain('Page not found');
	});

	it('ships the _headers file Cloudflare serves responses with', () => {
		// It lives in public/, so a move or rename silently stops it reaching the
		// client output and the site goes indexable without anything visibly breaking.
		expect(read('_headers')).toContain('X-Robots-Tag: noindex');
	});

	it('keeps the Studio out of the index', () => {
		// /studio is a login-walled admin SPA. It has no business in search results
		// even after the site-wide noindex comes off at launch.
		expect(read('_headers')).toMatch(/\/studio/);
	});

	it.todo('drops the site-wide noindex header once the placeholder content is gone');
});
