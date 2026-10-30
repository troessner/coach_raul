/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// astro.config.mjs builds a Sanity client as it loads, and it is loaded before
// any of vitest's own env handling runs. These are placeholders: tests/home-page
// mocks the query module, so nothing here ever reaches the network. The real
// guard against a missing project id is covered in tests/sanity.test.ts.
process.env.PUBLIC_SANITY_PROJECT_ID ??= 'testproject';
process.env.PUBLIC_SANITY_DATASET ??= 'test';

/**
 * Astro's Vite config, so tests can import and render `.astro` components.
 *
 * The home page stopped being a file in `dist/` when it moved to per-request
 * rendering, and its assertions — one h1, every image has alt text, no iframe —
 * are the ones most worth keeping. Rendering it through the container is what
 * replaces reading it off disk.
 */
export default getViteConfig({
	test: {
		include: ['tests/**/*.test.ts'],
	},
});
