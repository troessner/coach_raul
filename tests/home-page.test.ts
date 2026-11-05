import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import reactRenderer from '@astrojs/react/server.js';
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
		heroImage: {
			_type: 'image',
			asset: { _ref: 'image-hero-2000x1200-png' },
			alt: 'Coach Raul Payares training with a client',
		},
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
let previewHtml = '';
let response: Response;

beforeAll(async () => {
	// Layout.astro derives the canonical URL from Astro.site, which the
	// container does not inherit from astro.config.mjs.
	const container = await AstroContainer.create({ astroConfig: { site: 'https://coach-raul.test' } });
	// The preview overlay is a `client:only="react"` island. The container
	// resolves that directive against its registered renderers, so without these
	// two the preview render throws NoMatchingRenderer instead of asserting.
	container.addServerRenderer({ name: '@astrojs/react', renderer: reactRenderer });
	container.addClientRenderer({ name: '@astrojs/react', entrypoint: '@astrojs/react/client.js' });
	const { default: Index } = await import('../src/pages/index.astro');

	html = await container.renderToString(Index, { request: new Request('https://coach-raul.test/') });
	response = await container.renderToResponse(Index, { request: new Request('https://coach-raul.test/') });
	// index.astro reads this cookie directly, so setting it is all preview mode
	// needs here — /api/draft/enable's secret check is a separate route's job.
	previewHtml = await container.renderToString(Index, {
		request: new Request('https://coach-raul.test/', { headers: { cookie: 'sanity-draft-mode=true' } }),
	});
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

	it('points the class CTA at the booking URL from the CMS, in a new tab', () => {
		// Scoped to the section: a match anywhere in the document would also pass
		// on a footer link, which is not what this is about.
		const section = html.slice(html.indexOf('id="classes"'));
		const cta = section.match(/<a\b[^>]*>/)?.[0] ?? '';

		// Data flow, not configuration. A hardcoded cal.com link would render
		// perfectly and silently ignore every edit Raul makes in the Studio.
		expect(cta).toContain(`href="${content.settings.bookingUrl}"`);
		// Leaving the page mid-funnel loses the visitor.
		expect(cta).toContain('target="_blank"');
		// Reverse tabnabbing: without it the opened tab can navigate this one.
		expect(cta).toContain('rel="noopener');
	});

	it('ships no visual editing overlay outside preview', () => {
		// The overlay carries stega-encoded document ids. On a public page view
		// that would leak the content model to every visitor.
		expect(html).not.toMatch(/visual-editing/i);
	});

	it('mounts the visual editing overlay in preview', () => {
		// The counterpart to the test above, and the one that was missing: the
		// component renders null unless it is handed `enabled`, so gating it from
		// the outside with `{preview && <VisualEditing />}` emitted no island at
		// all. Draft mode, stega and the cookie all worked; the Studio's
		// Presentation pane just had nothing to talk to and said only
		// "Unable to connect" in a console it is easy not to open.
		expect(previewHtml).toContain('astro-island');
	});

	// Launch gates — unskip each one as the real content lands. See README.
	it.todo('replaces every example.com placeholder link with a real URL');
	it.todo('ships real client testimonials instead of the Canva placeholder copy');
});

describe('response headers', () => {
	// public/_headers covers static assets only. This page is rendered by the
	// Worker, so it never sees that file — these assertions are the only thing
	// standing between a placeholder page and Google's index.
	it('is not indexable while the content is still placeholder', () => {
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
	});

	it('allows same-origin framing so the Studio preview pane renders', () => {
		// DENY here blanks the Presentation pane with only a console error.
		expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
	});
});

describe('hero photo', () => {
	// Moved out of src/assets and into the CMS so Raul can swap it himself.
	it('is served from Sanity rather than bundled at build time', () => {
		expect(html).toContain('cdn.sanity.io');
		expect(html).toContain('w=1600');
	});

	it('carries the alt text from the CMS', () => {
		expect(html).toContain('alt="Coach Raul Payares training with a client"');
	});

	it('no longer emits an astro:assets build of hero.png', () => {
		// If the local import ever comes back, the optimised filename shows up
		// here and the two pipelines are both running again.
		expect(html).not.toMatch(/hero\.[A-Za-z0-9_-]+\.(png|webp|avif)/);
	});
});
