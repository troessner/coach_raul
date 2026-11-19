import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operator } from '../src/lib/sanity';

/**
 * The Impressum and the Datenschutzerklärung render per request now, because
 * the operator's details live in the CMS. They have no file in dist/, so these
 * assertions moved here out of tests/build-output.test.ts and render through
 * Astro's container against a fixture instead.
 *
 * What they are guarding is not layout. § 5 DDG and Art. 13 DSGVO each demand
 * specific facts on a specific page; a dropped `{operator.street}` is a missing
 * Pflichtangabe that looks like nothing in a source review.
 */
const operator: Operator = {
	name: 'Raul Payares',
	street: 'Beispielstraße 1',
	city: '10115 Berlin',
	country: 'Deutschland',
	phone: '+49 30 1234567',
	email: 'raul@example.com',
	vatId: null,
};

vi.mock('../src/lib/sanity', () => ({
	DRAFT_COOKIE: 'sanity-draft-mode',
	getOperator: async () => operator,
}));

let impressum = '';
let datenschutz = '';
let impressumResponse: Response;

beforeAll(async () => {
	// Layout.astro derives the canonical URL from Astro.site, which the
	// container does not inherit from astro.config.mjs.
	const container = await AstroContainer.create({ astroConfig: { site: 'https://coach-raul.test' } });
	const { default: Impressum } = await import('../src/pages/impressum.astro');
	const { default: Datenschutz } = await import('../src/pages/datenschutz.astro');

	const request = () => new Request('https://coach-raul.test/impressum/');

	impressum = await container.renderToString(Impressum, { request: request() });
	datenschutz = await container.renderToString(Datenschutz, { request: request() });
	impressumResponse = await container.renderToResponse(Impressum, { request: request() });
});

describe('legal pages', () => {
	it('renders both pages with their headings', () => {
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

	it('declares an absolute canonical URL', () => {
		for (const page of [impressum, datenschutz]) {
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

describe('operator details from the CMS', () => {
	it('prints every § 5 DDG Pflichtangabe in the Impressum', () => {
		// Name, physical address, phone and email are each required outright.
		// Dropping one is not a cosmetic gap, so each is asserted by value.
		for (const value of [
			operator.name,
			operator.street,
			operator.city,
			operator.country,
			operator.phone,
			operator.email,
		]) {
			expect(impressum).toContain(value);
		}
	});

	it('names the Verantwortlicher and a contact address in the Datenschutzerklärung', () => {
		// Art. 13 Abs. 1 lit. a DSGVO — the controller has to be identifiable.
		for (const value of [operator.name, operator.street, operator.city, operator.email]) {
			expect(datenschutz).toContain(value);
		}
	});

	it('drops the VAT section rather than printing an empty heading', () => {
		// A Kleinunternehmer nach § 19 UStG has no USt-IdNr., and a heading over
		// nothing reads as a missing value rather than an absent obligation.
		expect(impressum).not.toContain('Umsatzsteuer-Identifikationsnummer');
	});
});

describe('response headers', () => {
	it('keeps serving a stale copy for a day if Sanity is unreachable', () => {
		// § 5 DDG wants the Impressum ständig verfügbar. Moving it into the CMS
		// put a network call in front of a legally required page, and this long
		// stale window is what stops an outage turning it into a 500.
		expect(impressumResponse.headers.get('Cache-Control')).toContain('stale-while-revalidate=86400');
	});

	it('keys the edge cache on the draft cookie', () => {
		expect(impressumResponse.headers.get('Vary')).toBe('Cookie');
	});

	it('is not indexable while the content is still placeholder', () => {
		// public/_headers covers static assets only, and these pages are no longer
		// static — without the header helper they would be the one indexable
		// corner of a noindexed site.
		expect(impressumResponse.headers.get('X-Robots-Tag')).toBe('noindex');
	});
});
