import { createClient, type SanityClient } from '@sanity/client';
// The default export is the deprecated alias; createImageUrlBuilder is the one
// that is not going away.
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

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

/** Sanity's CDN resizes and re-encodes on its own, so these never touch astro:assets. */
export const imageUrl = (source: SanityImageSource, width: number) =>
	builder.image(source).width(width).auto('format').fit('max').url();

/** A Sanity image plus the alt text its schema requires alongside it. */
export type ImageWithAlt = SanityImageSource & { alt: string };

export interface SiteSettings {
	heroTitleLines: string[];
	heroSubLines: string[];
	heroImage: ImageWithAlt;
	heroCtaLabel: string;
	bioParagraphs: string[];
	bookingUrl: string;
}

export interface Service {
	title: string;
	body: string;
	href: string;
}

export interface Testimonial {
	quote: string;
	name: string;
	photo: ImageWithAlt;
}

export interface Social {
	network: 'facebook' | 'x' | 'instagram' | 'tiktok';
	label: string;
	href: string;
}

export interface PageContent {
	settings: SiteSettings;
	services: Service[];
	testimonials: Testimonial[];
	socials: Social[];
}

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

	const [settings, services, testimonials, socials] = await Promise.all([
		client.fetch<SiteSettings | null>(
			`*[_type == "siteSettings"][0]{heroTitleLines, heroSubLines, heroImage, heroCtaLabel, bioParagraphs, bookingUrl}`,
		),
		client.fetch<Service[]>(`*[_type == "service"]|order(order asc){title, body, href}`),
		client.fetch<Testimonial[]>(`*[_type == "testimonial"]|order(order asc){quote, name, photo}`),
		client.fetch<Social[]>(`*[_type == "social"]|order(order asc){network, label, href}`),
	]);

	if (!settings) {
		throw new Error(`No siteSettings document in the "${dataset}" dataset. Create and publish it in the Studio.`);
	}

	return {
		settings,
		services: requireRows(services, 'services'),
		testimonials: requireRows(testimonials, 'testimonials'),
		socials: requireRows(socials, 'social profiles'),
	};
};
