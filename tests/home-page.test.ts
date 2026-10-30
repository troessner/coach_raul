import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PageContent } from '../src/lib/sanity';

/**
 * The home page renders per request now, so there is no dist/index.html to read.
 * It is rendered here instead, against a fixture that stands in for Sanity —
 * which also means these assertions never touch the network or need credentials.
 *
 * The fixture deliberately uses the same example.com placeholders the seed
 * script writes, so the launch gate below describes the real current state.
 */
const content: PageContent = {
	settings: {
		heroTitleLines: ['Get stronger', 'Get healthier'],
		heroSubLines: ['I offer personal & group training', 'designed to help you get'],
		heroCtaLabel: 'Sign up now',
		bioParagraphs: ['Hi,', "I'm Raul Payares, originally from Colombia and now based in Berlin."],
		bookingUrl: 'https://example.com/pending-cal-com-event',
	},
	services: [
		{ title: 'Personal Training', body: 'One-on-one sessions.', href: 'https://example.com/pending-stripe' },
		{ title: 'Nutrition Coaching', body: 'Personalized guidance.', href: 'https://example.com/pending-stripe' },
	],
	testimonials: [
		{
			quote: 'It worked.',
			name: 'Client name',
			// Enough of a Sanity image reference for the URL builder to accept it.
			photo: { _type: 'image', asset: { _ref: 'image-abc-800x1200-png' }, alt: 'Client name' },
		},
	],
	socials: [{ network: 'instagram', label: 'Instagram', href: 'https://example.com/pending-instagram' }],
};

vi.mock('../src/lib/sanity', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../src/lib/sanity')>().catch(() => null);

	return {
		// Re-exported so the page's own imports resolve; the queries are replaced.
		DRAFT_COOKIE: 'sanity-draft-mode',
		imageUrl: (_source: unknown, width: number) => `https://cdn.sanity.io/images/p/production/abc.png?w=${width}`,
		getPageContent: async () => content,
		...(actual ? {} : {}),
	};
});

let html = '';

beforeAll(async () => {
	// Layout.astro derives the canonical URL from Astro.site, which the
	// container does not inherit from astro.config.mjs.
	const container = await AstroContainer.create({ astroConfig: { site: 'https://coach-raul.test' } });
	const { default: Index } = await import('../src/pages/index.astro');

	html = await container.renderToString(Index, { request: new Request('https://coach-raul.test/') });
});

describe('rendered home page', () => {
	it('has exactly one h1', () => {
		expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
	});

	it('gives every image an alt attribute', () => {
		// A decorative image is emitted as a bare `alt`, which is valid and still passes.
		const withoutAlt = (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\salt[=\s>]/.test(tag));
		expect(withoutAlt).toEqual([]);
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
		expect(html).toContain('href="mailto:');
		expect(html).toContain('href="tel:');
		expect(html).toContain('href="https://wa.me/');
	});

	it('renders the CMS content it was given', () => {
		// Proves the page is actually reading the query result rather than
		// anything left hardcoded behind it.
		expect(html).toContain('Personal Training');
		expect(html).toContain('Get stronger');
		expect(html).toContain('Sign up now');
	});

	it('offers class booking as a plain link, never an embedded frame', () => {
		// An embedded Cal.com (or YouTube) iframe fetches on page load and hands
		// every visitor's IP to a third party before they chose to go there — the
		// same exposure the self-hosted font exists to avoid. If the intro video
		// lands as a bare iframe, this is meant to fail.
		expect(html).toContain('id="classes"');
		expect(html).not.toMatch(/<iframe/);
	});

	it('ships no visual editing overlay outside preview', () => {
		// The overlay carries stega-encoded document ids. On a public page view
		// that would leak the content model to every visitor.
		expect(html).not.toMatch(/visual-editing/i);
	});

	// Launch gates — unskip each one as the real content lands. See README.
	it.todo('replaces every example.com placeholder link with a real URL');
	it.todo('ships real client testimonials instead of the Canva placeholder copy');
});
