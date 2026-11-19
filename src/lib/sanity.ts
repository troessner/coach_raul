import { createClient, type SanityClient } from '@sanity/client';
// The default export is the deprecated alias; createImageUrlBuilder is the one
// that is not going away.
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import type { RichText } from './richText';

/**
 * Two clients, one difference that matters: which documents they can see.
 *
 * The published client reads only published documents and needs no credentials.
 * The draft client reads unpublished edits and therefore needs a token, which
 * is why it is only ever constructed on the server, behind the preview cookie.
 */

/**
 * Reads a required variable, or throws naming it.
 *
 * The throw is the point. A missing project id must stop the request, because
 * the alternative — falling back to placeholder content — serves a page that
 * looks fine while the CMS behind it is doing nothing at all.
 */
export const requireEnv = (env: Record<string, string | undefined>, name: string): string => {
	const value = env[name];

	if (!value) {
		throw new Error(`${name} is not set. Copy .env.example to .env and fill it in — see the README's CMS section.`);
	}

	return value;
};

/**
 * Reads a secret that may arrive from either side of the build boundary.
 *
 * import.meta.env is baked at build time — that is where a local .env lands,
 * and why the project id can be read straight from it. A Cloudflare runtime
 * secret does not exist at build time at all: it is handed to the Worker per
 * request and surfaces on process.env, which nodejs_compat populates for any
 * compatibility date from 2025-04-01 onward.
 *
 * Reading only one of the two works in exactly one environment: import.meta.env
 * alone is fine locally and throws on every request in production, which is
 * what made the Presentation tool crash with a 500 rather than a 401.
 */
export const resolveSecret = (
	buildEnv: Record<string, string | undefined>,
	runtimeEnv: Record<string, string | undefined> | undefined,
	name: string,
): string => requireEnv({ [name]: buildEnv[name] || runtimeEnv?.[name] }, name);

/** Set by /api/draft/enable, cleared by /api/draft/disable. Server-read only. */
export const DRAFT_COOKIE = 'sanity-draft-mode';

const projectId = requireEnv(import.meta.env, 'PUBLIC_SANITY_PROJECT_ID');
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';

// A date, not a semver — it pins the query language and response shape.
const apiVersion = '2026-10-30';

const publishedClient = createClient({
	projectId,
	dataset,
	apiVersion,
	useCdn: true,
	perspective: 'published',
});

/**
 * Built per request rather than once at module load: it carries a token, and a
 * module-level client would construct it even on the public path where there is
 * no token to give it.
 */
const draftClient = (): SanityClient =>
	createClient({
		projectId,
		dataset,
		apiVersion,
		// Drafts change while someone is typing in the Studio; the CDN would serve
		// a version of them from seconds ago.
		useCdn: false,
		perspective: 'drafts',
		token: resolveSecret(import.meta.env, globalThis.process?.env, 'SANITY_READ_TOKEN'),
		// Encodes document and field ids invisibly into every string, which is what
		// lets the Presentation overlay turn rendered text into a click-to-edit
		// target. Never enabled outside preview — it would ship the ids to visitors.
		stega: { enabled: true, studioUrl: '/studio' },
	});

export const getClient = (preview: boolean): SanityClient => (preview ? draftClient() : publishedClient);

const builder = createImageUrlBuilder(publishedClient);

/**
 * Sanity's CDN resizes and re-encodes on its own, so these never touch
 * astro:assets.
 *
 * Returns null for a missing source rather than throwing. The builder throws
 * "Unable to resolve image URL from source (null)", and because that happens
 * while the page is still assembling its frontmatter it takes the whole
 * response with it — a 500 with an empty body, for one absent photo. Callers
 * render the <img> only when there is a URL, so the page loses an image
 * instead of losing the page.
 */
export const imageUrl = (source: SanityImageSource | null | undefined, width: number): string | null =>
	source ? builder.image(source).width(width).auto('format').fit('max').url() : null;

/** A Sanity image plus the alt text its schema requires alongside it. */
export type ImageWithAlt = SanityImageSource & { alt: string };

export interface SiteSettings {
	heroTitleLines: string[];
	heroSubLines: string[];
	heroImage: ImageWithAlt | null;
	heroCtaLabel: string;
	portraitImage: ImageWithAlt | null;
	/** Rich text, or the plain strings pre-migration documents still hold. */
	bioParagraphs: RichText;
	aboutHeadingLines: string[];
	servicesHeading: string;
	classesHeading: string;
	storiesHeading: string;
	connectHeading: string;
	bookingUrl: string;
}

/**
 * The operator's legal identity — § 5 DDG data, shared by the Impressum, the
 * Datenschutzerklärung and the footer's contact links so the three can never
 * disagree with each other.
 */
export interface Operator {
	name: string;
	street: string;
	city: string;
	country: string;
	phone: string;
	email: string;
	vatId: string | null;
}

export interface Service {
	title: string;
	body: string;
	href: string;
}

export interface Testimonial {
	/** Rich text, or the plain string pre-migration documents still hold. */
	quote: RichText;
	name: string;
	photo: ImageWithAlt | null;
}

export interface Social {
	network: 'facebook' | 'x' | 'instagram' | 'tiktok';
	label: string;
	href: string;
}

export interface PageContent {
	settings: SiteSettings;
	operator: Operator;
	services: Service[];
	testimonials: Testimonial[];
	socials: Social[];
}

// Named once because two different fetchers ask for it: the home page pulls it
// with the rest of the page, the legal pages pull it on its own.
const OPERATOR_QUERY = `*[_type == "operator"][0]{name, street, city, country, phone, email, vatId}`;

/**
 * Throws rather than returning null, for the same reason requireRows does.
 * A missing operator document on the Impressum is not a blank section — it is
 * an unreachable Pflichtangabe, which is worse than an error page.
 */
export const getOperator = async (preview: boolean): Promise<Operator> => {
	const operator = await getClient(preview).fetch<Operator | null>(OPERATOR_QUERY);

	if (!operator) {
		throw new Error(`No operator document in the "${dataset}" dataset. Create and publish it in the Studio.`);
	}

	return operator;
};

/**
 * Throws on an empty result rather than returning one.
 *
 * An empty array here renders a heading with nothing under it, which looks like
 * a styling bug and hides the real cause — an unpublished document, a wrong
 * dataset, a typo'd type name. Failing the request names it instead.
 */
export const requireRows = <T>(rows: T[], what: string): T[] => {
	if (rows.length === 0) {
		throw new Error(`Sanity returned no ${what}. Check the documents are published in the "${dataset}" dataset.`);
	}

	return rows;
};

/** One round trip's worth of queries, so the page awaits once. */
export const getPageContent = async (preview: boolean): Promise<PageContent> => {
	const client = getClient(preview);

	const [settings, operator, services, testimonials, socials] = await Promise.all([
		// coalesce(..., []) on every array: a field added to the schema does not
		// exist on documents written before it, and `.map` of undefined throws
		// while the page is still assembling — a 500 for a field nobody has
		// filled in yet. An empty array renders an empty section instead, which
		// is visible in the Studio and harmless to a visitor. This is also true
		// of a *draft* written before the field existed, which shadows the
		// published document in preview even when the published one is complete.
		client.fetch<SiteSettings | null>(
			`*[_type == "siteSettings"][0]{
				"heroTitleLines": coalesce(heroTitleLines, []),
				"heroSubLines": coalesce(heroSubLines, []),
				heroImage,
				heroCtaLabel,
				portraitImage,
				"bioParagraphs": coalesce(bioParagraphs, []),
				"aboutHeadingLines": coalesce(aboutHeadingLines, []),
				servicesHeading,
				classesHeading,
				storiesHeading,
				connectHeading,
				bookingUrl
			}`,
		),
		client.fetch<Operator | null>(OPERATOR_QUERY),
		client.fetch<Service[]>(`*[_type == "service"]|order(order asc){title, body, href}`),
		client.fetch<Testimonial[]>(`*[_type == "testimonial"]|order(order asc){quote, name, photo}`),
		client.fetch<Social[]>(`*[_type == "social"]|order(order asc){network, label, href}`),
	]);

	if (!settings) {
		throw new Error(`No siteSettings document in the "${dataset}" dataset. Create and publish it in the Studio.`);
	}

	if (!operator) {
		throw new Error(`No operator document in the "${dataset}" dataset. Create and publish it in the Studio.`);
	}

	return {
		settings,
		operator,
		services: requireRows(services, 'services'),
		testimonials: requireRows(testimonials, 'testimonials'),
		socials: requireRows(socials, 'social profiles'),
	};
};
