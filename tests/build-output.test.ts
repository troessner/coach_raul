import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Asserts on the real built HTML rather than on source, so these catch the
 * failures that actually reach visitors: a dropped heading, an image shipped
 * without alt text, a CTA whose href went missing in a refactor.
 *
 * Requires `npm run build` first — `npm run ci` and the GitHub workflow both
 * build before they test.
 */
const read = (page: string) => {
	const file = fileURLToPath(new URL(`../dist/${page}`, import.meta.url));

	if (!existsSync(file)) {
		throw new Error(`No build output at ${file}. Run "npm run build" before "npm test".`);
	}

	return readFileSync(file, 'utf8');
};

const html = read('index.html');
const impressum = read('impressum/index.html');
const datenschutz = read('datenschutz/index.html');
const notFound = read('404.html');

describe('built home page', () => {
	it('has exactly one h1', () => {
		expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
	});

	it('has a non-empty title and meta description for search results', () => {
		const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
		expect(title.trim().length).toBeGreaterThan(0);
		expect(html).toMatch(/<meta name="description" content="[^"]+"/);
	});

	it('gives every image an alt attribute', () => {
		// A decorative image is emitted as a bare `alt`, which is valid and still passes.
		const withoutAlt = (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\salt[=\s>]/.test(tag));
		expect(withoutAlt).toEqual([]);
	});

	it('renders all four services', () => {
		// Substrings chosen to sidestep HTML entity encoding of "&".
		for (const service of [
			'Personal Training',
			'Nutrition Coaching',
			'Motivation Coaching',
			'90-Day Transformation Challenge',
		]) {
			expect(html).toContain(service);
		}
	});

	it('leaves no anchor without an href', () => {
		const hrefless = (html.match(/<a\b[^>]*>/g) ?? []).filter((tag) => !/\shref=/.test(tag));
		expect(hrefless).toEqual([]);
	});

	it('links to the Impressum and the Datenschutzerklärung', () => {
		// Both have to be reachable from the home page — § 5 DDG, Art. 13 DSGVO.
		// The trailing slash matters: without it the host answers 307, not 200.
		expect(html).toContain('href="/impressum/"');
		expect(html).toContain('href="/datenschutz/"');
	});

	it('offers a reachable way to make contact', () => {
		// Deliberately a mailto / tel / WhatsApp link rather than a form — there is
		// no backend to post one to, and nothing here needs one yet.
		expect(html).toContain('href="mailto:');
		expect(html).toContain('href="tel:');
		expect(html).toContain('href="https://wa.me/');
	});

	// Launch gates — unskip each one as the real content lands. See README.
	it.todo('points every call to action at a real Stripe Payment Link, not "#"');
	it.todo('ships real client testimonials instead of the Canva placeholder copy');
	it.todo('links each social icon to a real profile URL');
});

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

	it.todo("carries Raul's real address, phone and email instead of TODO placeholders");
});

describe('every built page', () => {
	it('declares an absolute canonical URL', () => {
		// Relative values here are ignored. They have to come off Astro.site, so
		// this also fails if `site` ever drops out of astro.config.mjs.
		for (const page of [html, impressum, datenschutz, notFound]) {
			expect(page).toMatch(/<link rel="canonical" href="https:\/\/[^"]+"/);
		}
	});

	it('loads no font or asset from a Google domain', () => {
		// Remote Google Fonts hand every visitor's IP to Google, which is a standing
		// Abmahnung risk for a German site. The font is self-hosted — keep it that way.
		for (const page of [html, impressum, datenschutz]) {
			expect(page).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
		}
	});
});

describe('deploy config', () => {
	it('builds a 404 page for Cloudflare to serve', () => {
		// wrangler.jsonc sets not_found_handling; without this file it has nothing
		// to point at and visitors get Cloudflare's unstyled default.
		expect(notFound).toContain('Page not found');
	});

	it('ships the _headers file Cloudflare serves responses with', () => {
		// It lives in public/, so a move or rename silently stops it reaching dist/
		// and the site goes indexable without anything visibly breaking.
		expect(read('_headers')).toContain('X-Robots-Tag: noindex');
	});

	it.todo('drops the noindex header once the placeholder content is gone');
});
