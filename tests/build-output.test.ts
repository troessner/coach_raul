import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Asserts on the real built files rather than on source, so these catch the
 * failures that actually reach visitors: a dropped heading, a missing header
 * file, a canonical URL that stopped being absolute.
 *
 * Only the prerendered pages are here. The home page renders per request and
 * has no file in dist/ — it is rendered through Astro's container instead, in
 * tests/home-page.test.ts.
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

const impressum = read('impressum/index.html');
const datenschutz = read('datenschutz/index.html');
const notFound = read('404.html');

describe('legal pages', () => {
	it('builds both pages with their headings', () => {
		expect(impressum).toContain('>Impressum<');
		expect(datenschutz).toContain('>Datenschutzerklärung<');
	});

	it('names the statute the Impressum exists to satisfy', () => {
		expect(impressum).toContain('§ 5 DDG');
	});

	it('cross-links the two pages', () => {
		expect(impressum).toContain('href="/datenschutz/"');
		expect(datenschutz).toContain('href="/impressum/"');
	});

	it('names the booking processor and the legal basis for it', () => {
		// Art. 13 DSGVO: a new processor touching personal data has to be named on
		// the page before it starts touching any.
		expect(datenschutz).toContain('Cal.com');
		expect(datenschutz).toContain('Art. 6 Abs. 1 lit. b DSGVO');
	});

	it('stays prerendered — these have no CMS content and need no request', () => {
		// If either ever starts rendering per request, this file stops finding it
		// and the failure says so rather than the page silently costing a Worker
		// invocation on every visit.
		expect(impressum.length).toBeGreaterThan(0);
		expect(datenschutz.length).toBeGreaterThan(0);
	});

	it.todo("carries Raul's real address, phone and email instead of TODO placeholders");
});

describe('every prerendered page', () => {
	it('declares an absolute canonical URL', () => {
		// Relative values here are ignored. They have to come off Astro.site, so
		// this also fails if `site` ever drops out of astro.config.mjs.
		for (const page of [impressum, datenschutz, notFound]) {
			expect(page).toMatch(/<link rel="canonical" href="https:\/\/[^"]+"/);
		}
	});

	it('loads no font or asset from a Google domain', () => {
		// Remote Google Fonts hand every visitor's IP to Google, which is a standing
		// Abmahnung risk for a German site. The font is self-hosted — keep it that way.
		for (const page of [impressum, datenschutz]) {
			expect(page).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
		}
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
