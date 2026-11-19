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
		portraitImage: {
			_type: 'image',
			asset: { _ref: 'image-portrait-908x1210-png' },
			alt: 'Raul Payares with a slam ball on the Spree',
		},
		bioParagraphs: ['Hi,', "I'm Raul Payares, originally from Colombia and now based in Berlin."],
		aboutHeadingLines: ['Meet', 'Coach Raul Payares'],
		servicesHeading: 'Service',
		classesHeading: 'Group classes',
		storiesHeading: 'Success stories',
		connectHeading: 'Stay connected',
		bookingUrl: 'https://example.com/pending-cal-com-event',
	},
	operator: {
		name: 'Raul Payares',
		street: 'Beispielstraße 1',
		city: '10115 Berlin',
		country: 'Deutschland',
		phone: '+49 30 1234567',
		email: 'raul@example.com',
		vatId: null,
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

/**
 * What getPageContent returns for the next render. Swapped in beforeAll so the
 * sparse case below can be rendered by the same mock.
 */
let current: PageContent = content;

vi.mock('../src/lib/sanity', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../src/lib/sanity')>().catch(() => null);

	return {
		// Re-exported so the page's own imports resolve; the queries are replaced.
		DRAFT_COOKIE: 'sanity-draft-mode',
		// Mirrors the real null-for-missing-source contract, which is the whole
		// point of the sparse render below.
		imageUrl: (source: unknown, width: number) =>
			source ? `https://cdn.sanity.io/images/p/production/abc.png?w=${width}` : null,
		getPageContent: async () => current,
		...(actual ? {} : {}),
	};
});

let html = '';
let previewHtml = '';
let sparseHtml = '';
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

	// Every optional field absent, exactly as a document written before those
	// fields existed comes back — including a draft that shadows a complete
	// published document in preview. The arrays are empty rather than
	// undefined because the GROQ query coalesces them.
	current = {
		...content,
		settings: {
			...content.settings,
			heroTitleLines: [],
			heroSubLines: [],
			heroImage: null,
			portraitImage: null,
			bioParagraphs: [],
			aboutHeadingLines: [],
		},
		testimonials: [{ ...content.testimonials[0], photo: null }],
	};
	sparseHtml = await container.renderToString(Index, { request: new Request('https://coach-raul.test/') });
	current = content;
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

	it('takes every section heading from the CMS', () => {
		// Hardcoding one of these would render identically today and then ignore
		// every edit Raul makes, which is the failure the whole change exists to
		// prevent — so the assertion is that each heading is inside its section,
		// not merely somewhere on the page.
		const section = (id: string) => html.slice(html.indexOf(`id="${id}"`));

		expect(section('about')).toContain(content.settings.aboutHeadingLines[1]);
		expect(section('services')).toContain(content.settings.servicesHeading);
		expect(section('classes')).toContain(content.settings.classesHeading);
		expect(section('stories')).toContain(content.settings.storiesHeading);
		expect(section('contact')).toContain(content.settings.connectHeading);
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

	it('keys the edge cache on the draft cookie', () => {
		// The published body is cached at Cloudflare for 60s. Without Vary that
		// one body is served to previewing editors too, so the hero flips between
		// draft and published depending on whether the request reached the Worker.
		expect(response.headers.get('Cache-Control')).toContain('s-maxage=60');
		expect(response.headers.get('Vary')).toBe('Cookie');
	});
});

describe('preview bar', () => {
	it('warns that a preview session is not the live site, with a way out', () => {
		// The draft cookie is httpOnly and covers the whole origin for an hour,
		// so without this a draft reads as published and gets acted on as such.
		expect(previewHtml).toContain('preview-bar');
		expect(previewHtml).toContain('/api/draft/disable');
	});

	it('shows no preview bar to ordinary visitors', () => {
		expect(html).not.toContain('preview-bar');
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

describe('bio portrait', () => {
	// Moved out of src/assets and into the CMS for the same reason as the hero.
	it('carries the alt text from the CMS', () => {
		expect(html).toContain('alt="Raul Payares with a slam ball on the Spree"');
	});

	it('no longer emits an astro:assets build of raul-portrait.png', () => {
		expect(html).not.toMatch(/raul-portrait\.[A-Za-z0-9_-]+\.(png|webp|avif)/);
	});
});

describe('footer contact details', () => {
	// They come from the same `operator` document the Impressum reads. A
	// hardcoded copy here is the Abmahnung risk the single source exists to
	// remove, so these assert the rendered links carry the CMS values.
	it('builds the mailto, tel and WhatsApp links from the operator document', () => {
		const footer = html.slice(html.indexOf('id="contact"'));

		expect(footer).toContain(`href="mailto:${content.operator.email}"`);
		expect(footer).toContain('href="tel:+49301234567"');
		expect(footer).toContain('href="https://wa.me/49301234567"');
	});

	it('prints the email and phone as the operator document spells them', () => {
		const footer = html.slice(html.indexOf('id="contact"'));

		expect(footer).toContain(content.operator.email);
		expect(footer).toContain(content.operator.phone);
	});
});

describe('a document missing the fields a later schema added', () => {
	/**
	 * This is the regression that took the live site down twice. A field added
	 * to the schema does not exist on documents written before it, and both
	 * failure modes killed the whole response while the page was still
	 * assembling its frontmatter: `.map` of undefined for an array, and
	 * "Unable to resolve image URL from source (null)" for an image. The result
	 * was a 500 with an empty body for content nobody had filled in yet.
	 *
	 * The legal details are deliberately not covered by this: getOperator still
	 * throws, because an Impressum rendering without an address is a missing
	 * Pflichtangabe, which is worse than an error page.
	 */
	it('still renders the page', () => {
		expect(sparseHtml).toContain('</html>');
		expect(sparseHtml.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
	});

	it('omits the images rather than emitting a broken src', () => {
		// `src="null"` would be a request to /null on every page view.
		expect(sparseHtml).not.toMatch(/src="null"/);
		expect(sparseHtml).not.toMatch(/srcset="[^"]*null/);
		expect(sparseHtml).not.toContain('class="hero-photo"');
		expect(sparseHtml).not.toContain('class="portrait"');
	});

	it('keeps the parts that do not depend on the missing fields', () => {
		// The point of degrading rather than failing: everything else still works.
		expect(sparseHtml).toContain(content.settings.heroCtaLabel);
		expect(sparseHtml).toContain('Personal Training');
		expect(sparseHtml).toContain(`href="${content.settings.bookingUrl}"`);
		expect(sparseHtml).toContain('href="/impressum/"');
	});

	it('keeps a story that lost its photo', () => {
		// The quote is the content; the photo is decoration around it.
		expect(sparseHtml).toContain('It worked.');
	});

	it('leaves every surviving image with an alt attribute', () => {
		const withoutAlt = (sparseHtml.match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\salt[=\s>]/.test(tag));
		expect(withoutAlt).toEqual([]);
	});
});

describe('section jump links', () => {
	const navLinks = () => {
		const nav = html.slice(html.indexOf('<nav class="site-nav"'));

		return [...nav.slice(0, nav.indexOf('</nav>')).matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
	};

	it('offers a link to every section', () => {
		expect(navLinks()).toEqual(['about', 'services', 'classes', 'stories', 'contact']);
	});

	it('points every link at a target that exists on the page', () => {
		// The failure this exists for: renaming a section's id leaves a link that
		// looks fine, is keyboard reachable, and silently does nothing.
		for (const id of navLinks()) {
			expect(html).toContain(`id="${id}"`);
		}
	});

	it('names the nav for screen readers', () => {
		// Several navs on this page — this one and the legal links in the footer.
		// Without a label they are announced identically.
		expect(html).toContain('<nav class="site-nav" aria-label="Sections"');
	});
});
