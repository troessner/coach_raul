// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import { loadEnv } from 'vite';

// astro.config.mjs runs before Astro populates import.meta.env, and Astro never
// writes .env into process.env — so reading process.env here finds nothing
// locally and the Sanity client is constructed without a projectId. It only
// looked fine on Cloudflare, where the build variables are real process env.
// loadEnv reads the .env files *and* merges matching process.env keys, so one
// call covers local dev, local build, CI and Cloudflare alike.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'PUBLIC_');

// https://astro.build/config
export default defineConfig({
	// TODO: swap for the real domain once it exists. Canonical URLs and og:url are
	// derived from this, so it has to be the hostname we actually want indexed —
	// otherwise the temporary one competes with the real one in search results.
	site: 'https://coach-raul.timo-roessner.workers.dev',

	// Still 'static': only the pages that need a request render on one. The home
	// page opts out with `export const prerender = false` because it reads the
	// CMS, and so do the two preview routes. The legal pages and the 404 have no
	// CMS content in them and stay as plain files on the edge.
	output: 'static',
	// Vitest renders pages through Astro's container to assert on their markup.
	// The Cloudflare adapter's Vite plugin takes the test runner into workerd
	// when it is present, where the runner's own entry point cannot load.
	adapter: process.env.VITEST ? undefined : cloudflare(),

	integrations: [
		sanity({
			projectId: env.PUBLIC_SANITY_PROJECT_ID,
			dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
			useCdn: true,
			// Mounts the Studio at /studio from ./sanity.config.ts. Same origin as
			// the site it previews, which is what lets the preview cookie work
			// without CORS entries or SameSite=None.
			studioBasePath: '/studio',
		}),
		// Sanity Studio and the visual editing overlay are React. Nothing else on
		// the site is, and neither ships on a normal page view.
		react(),
	],
});
