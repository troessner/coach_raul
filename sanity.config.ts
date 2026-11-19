import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { schemaTypes } from './src/sanity/schemaTypes';

/** Pinned to fixed document ids below, so they must not also appear as lists. */
const SINGLETONS = ['siteSettings', 'operator'];

/**
 * Mounted at /studio by the @sanity/astro integration in astro.config.mjs, so
 * the Studio and the site it previews share an origin. That is the whole reason
 * it lives here rather than in a separate npm project: cross-origin preview
 * needs CORS entries and a SameSite=None cookie, and same-origin needs neither.
 */
export default defineConfig({
	name: 'coach-raul',
	title: 'Coach Raul Payares',
	projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
	dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
	plugins: [
		presentationTool({
			// Side-by-side editing: the Studio iframes the real site and swaps
			// content as it is typed, before anything is published.
			previewUrl: {
				// No origin: it defaults to location.origin, which is already the site
				// this Studio is mounted on. Naming one would hardcode the deploy
				// hostname and break the day a real domain is attached.
				//
				// 'same-origin' was not a keyword — `origin` takes a URL, so that
				// string crashed the tool when it tried to parse one. `origin` and
				// `preview` are both deprecated in favour of `initial`.
				initial: '/',
				previewMode: {
					enable: '/api/draft/enable',
					disable: '/api/draft/disable',
				},
			},
		}),
		structureTool({
			// siteSettings and operator are singletons — one document each, never a
			// list. Without this the Studio offers a "create new" button that
			// produces a second one and the site's query silently picks whichever
			// sorts first.
			structure: (S) =>
				S.list()
					.title('Content')
					.items([
						S.listItem()
							.title('Site settings')
							.id('siteSettings')
							.child(S.document().schemaType('siteSettings').documentId('siteSettings')),
						S.listItem()
							.title('Legal & contact details')
							.id('operator')
							.child(S.document().schemaType('operator').documentId('operator')),
						S.divider(),
						...S.documentTypeListItems().filter((item) => !SINGLETONS.includes(item.getId() ?? '')),
					]),
		}),
	],
	schema: { types: schemaTypes },
});
