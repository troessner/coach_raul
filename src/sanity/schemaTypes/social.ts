import { defineField, defineType } from 'sanity';

/**
 * `network` is a closed list because SocialLinks.astro holds one hardcoded SVG
 * path per value. A network typed in freehand would render an empty icon, so
 * adding one here means adding its path there in the same change.
 */
export const social = defineType({
	name: 'social',
	title: 'Social profile',
	type: 'document',
	fields: [
		defineField({
			name: 'network',
			type: 'string',
			options: {
				list: [
					{ title: 'Facebook', value: 'facebook' },
					{ title: 'X', value: 'x' },
					{ title: 'Instagram', value: 'instagram' },
					{ title: 'TikTok', value: 'tiktok' },
				],
				layout: 'radio',
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'label',
			title: 'Accessible label',
			description: 'Read aloud by screen readers in place of the icon, e.g. "Instagram".',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'href',
			title: 'Profile URL',
			type: 'url',
			validation: (rule) => rule.required().uri({ scheme: ['https'] }),
		}),
		defineField({
			name: 'order',
			title: 'Position in the footer',
			type: 'number',
			validation: (rule) => rule.required().integer(),
		}),
	],
	orderings: [{ title: 'Footer order', name: 'footerOrder', by: [{ field: 'order', direction: 'asc' }] }],
	preview: { select: { title: 'label', subtitle: 'href' } },
});
