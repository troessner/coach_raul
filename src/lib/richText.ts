import { toHTML, uriLooksSafe } from '@portabletext/to-html';
import type { PortableTextBlock } from '@portabletext/types';

/**
 * Renders the `richText` fields to HTML.
 *
 * Also accepts the plain strings those fields used to hold. `bioParagraphs`
 * and `quote` were `string[]` and `string` before rich text, and every
 * document already in the dataset still stores them that way until
 * scripts/migrate-rich-text.mjs runs. Normalising on read means the site is
 * correct either side of that migration, so the deploy and the migration do
 * not have to be ordered against each other — the thing that broke the site
 * twice this week.
 */
export type RichText = PortableTextBlock[] | string[] | string | null | undefined;

/** A legacy plain string, wrapped so the renderer sees one ordinary paragraph. */
const blockFromString = (text: string, i: number): PortableTextBlock => ({
	_type: 'block',
	_key: `legacy-${i}`,
	style: 'normal',
	markDefs: [],
	children: [{ _type: 'span', _key: `legacy-${i}-0`, text, marks: [] }],
});

const asBlocks = (value: RichText): PortableTextBlock[] => {
	if (!value) return [];
	if (typeof value === 'string') return [blockFromString(value, 0)];

	return value.map((entry, i) => (typeof entry === 'string' ? blockFromString(entry, i) : entry));
};

export const renderRichText = (value: RichText): string =>
	toHTML(asBlocks(value), {
		components: {
			block: {
				normal: ({ children }) => `<p>${children}</p>`,
			},
			marks: {
				highlight: ({ children }) => `<span class="rt-highlight">${children}</span>`,
				link: ({ children, value: mark }) => {
					const href = typeof mark?.href === 'string' ? mark.href.trim() : '';

					// Content is trusted-ish — it comes from the Studio, not from
					// visitors — but "trusted-ish" is not a reason to emit a
					// javascript: URL into a page. uriLooksSafe is the renderer's own
					// check; a link that fails it keeps its text and loses its href.
					//
					// The empty check is not redundant: uriLooksSafe("") is true, so
					// an annotation saved without a URL would otherwise render as
					// <a href="">, which reloads the page when clicked.
					if (!href || !uriLooksSafe(href)) return children;

					const external = /^https?:/i.test(href);
					const attrs = external ? ' rel="noopener noreferrer" target="_blank"' : '';

					// toHTML escapes the text it renders; href comes from a url-typed
					// field, and quotes are the only thing that could break out here.
					return `<a href="${href.replace(/"/g, '&quot;')}"${attrs}>${children}</a>`;
				},
			},
		},
	});
