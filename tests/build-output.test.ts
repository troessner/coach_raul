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
const distIndex = fileURLToPath(new URL('../dist/index.html', import.meta.url));

if (!existsSync(distIndex)) {
	throw new Error(`No build output at ${distIndex}. Run "npm run build" before "npm test".`);
}

const html = readFileSync(distIndex, 'utf8');

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

	// Launch gates — unskip each one as the real content lands. See README.
	it.todo('points every call to action at a real Stripe Payment Link, not "#"');
	it.todo('ships real client testimonials instead of the Canva placeholder copy');
	it.todo('links each social icon to a real profile URL');
});
