import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { schemaTypes } from './src/sanity/schemaTypes';

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
				origin: 'same-origin',
				preview: '/',
				previewMode: { enable: '/api/draft/enable' },
			},
		}),
		structureTool({
			// siteSettings is a singleton — one document, never a list. Without this
			// the Studio offers a "create new" button that produces a second one and
			// the site's query silently picks whichever sorts first.
			structure: (S) =>
				S.list()
					.title('Content')
					.items([
						S.listItem()
							.title('Site settings')
							.id('siteSettings')
							.child(S.document().schemaType('siteSettings').documentId('siteSettings')),
						S.divider(),
						...S.documentTypeListItems().filter((item) => item.getId() !== 'siteSettings'),
					]),
		}),
	],
	schema: { types: schemaTypes },
});
