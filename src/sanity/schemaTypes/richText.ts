import { defineArrayMember, defineType } from 'sanity';

/**
 * The one rich-text shape in this schema, shared by the bio and the story
 * quotes — the two fields that are somebody's prose rather than display type.
 *
 * Deliberately narrow. Headings and lists are left out because neither field
 * is a document: a bio with an <h2> in the middle of it fights the page's own
 * heading order, and the design has no list style. What is left is emphasis
 * and links, which is what the fields were actually missing.
 *
 * "highlight" renders in --fg (white) rather than a colour of its own. The bio
 * is already accent green end to end, so white is what stands out in it; a
 * green decorator would be invisible exactly where it would be reached for.
 */
export const richText = defineType({
	name: 'richText',
	title: 'Rich text',
	type: 'array',
	of: [
		defineArrayMember({
			type: 'block',
			// One style only, so the editor offers no heading levels to choose from.
			styles: [{ title: 'Paragraph', value: 'normal' }],
			lists: [],
			marks: {
				decorators: [
					{ title: 'Bold', value: 'strong' },
					{ title: 'Italic', value: 'em' },
					{ title: 'Highlight', value: 'highlight' },
				],
				annotations: [
					defineArrayMember({
						name: 'link',
						title: 'Link',
						type: 'object',
						fields: [
							{
								name: 'href',
								title: 'URL',
								type: 'url',
								validation: (rule) =>
									rule
										.required()
										// mailto and tel alongside http(s): the bio is as likely to
										// link a contact as a page.
										.uri({ scheme: ['http', 'https', 'mailto', 'tel'] }),
							},
						],
					}),
				],
			},
		}),
	],
});
