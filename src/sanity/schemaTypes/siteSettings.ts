import { defineField, defineType } from 'sanity';

/**
 * The one-off copy on the home page. A singleton: sanity.config.ts pins it to
 * the document id "siteSettings" so there can only ever be one.
 *
 * Hero and bio copy are arrays of lines rather than one rich-text field. The
 * design breaks those lines deliberately ("Get stronger" / "Get healthier"),
 * and an array keeps that control in the CMS without putting raw HTML in it —
 * which is also why there is no Portable Text anywhere in this schema and so
 * no renderer dependency on the site.
 */
export const siteSettings = defineType({
	name: 'siteSettings',
	title: 'Site settings',
	type: 'document',
	fields: [
		defineField({
			name: 'heroTitleLines',
			title: 'Hero headline (one entry per line)',
			type: 'array',
			of: [{ type: 'string' }],
			validation: (rule) => rule.required().min(1).max(3),
		}),
		defineField({
			name: 'heroSubLines',
			title: 'Hero subline (one entry per line)',
			type: 'array',
			of: [{ type: 'string' }],
			validation: (rule) => rule.required().min(1).max(4),
		}),
		defineField({
			name: 'heroImage',
			title: 'Hero photo',
			description:
				'The full-bleed photo behind the headline. At least 1280px on the long edge. It is cropped to fill the viewport at any aspect ratio, so keep faces near the centre — portrait and landscape both work.',
			type: 'image',
			options: { hotspot: true },
			fields: [
				defineField({
					name: 'alt',
					title: 'Alt text',
					description: 'Describes the photo for screen readers.',
					type: 'string',
					validation: (rule) => rule.required(),
				}),
			],
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'heroCtaLabel',
			title: 'Hero button label',
			type: 'string',
			validation: (rule) => rule.required().max(24),
		}),
		defineField({
			name: 'bioParagraphs',
			title: 'Bio (one entry per paragraph)',
			type: 'array',
			of: [{ type: 'text', rows: 3 }],
			validation: (rule) => rule.required().min(1),
		}),
		defineField({
			name: 'bookingUrl',
			title: 'Cal.com booking link for group classes',
			description:
				'The public Cal.com event URL, e.g. https://cal.com/raul/group-class. Use that public link, NOT the app.cal.com/event-types/... address from the dashboard — that one is behind a login and visitors would hit a sign-in wall. Opens in a new tab: it is deliberately not embedded, because an embedded frame would send every visitor to Cal.com before they clicked anything.',
			type: 'url',
			validation: (rule) => rule.required().uri({ scheme: ['https'] }),
		}),
	],
	preview: {
		prepare: () => ({ title: 'Site settings' }),
	},
});
