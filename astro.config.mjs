// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// TODO: swap for the real domain once it exists. Canonical URLs and og:url are
	// derived from this, so it has to be the hostname we actually want indexed —
	// otherwise the temporary one competes with the real one in search results.
	site: 'https://coach-raul.timo-roessner.workers.dev',
});
