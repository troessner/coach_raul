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
			name: 'portraitImage',
			title: 'Portrait photo',
			description:
				'The photo beside the "Meet Coach Raul Payares" bio. Shown in a 3:4 portrait frame and cropped to fill it, so leave room around the edges.',
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
			name: 'bioParagraphs',
			title: 'Bio',
			description: 'Select a word to make it bold, italic, highlighted (white, since the bio is green) or a link.',
			// Still named bioParagraphs: renaming it would mean reading two field
			// names for the sake of a tidier one, and the paragraphs are now blocks
			// inside this array rather than entries of it.
			type: 'richText',
			validation: (rule) => rule.required().min(1),
		}),
		defineField({
			name: 'aboutHeadingLines',
			title: 'Bio section heading (one entry per line)',
			description: 'Sits beside the portrait. The design breaks it across two lines.',
			type: 'array',
			of: [{ type: 'string' }],
			validation: (rule) => rule.required().min(1).max(3),
		}),
		defineField({
			name: 'servicesHeading',
			title: 'Services section heading',
			type: 'string',
			validation: (rule) => rule.required().max(40),
		}),
		defineField({
			name: 'classesHeading',
			title: 'Group classes section heading',
			type: 'string',
			validation: (rule) => rule.required().max(40),
		}),
		defineField({
			name: 'storiesHeading',
			title: 'Success stories section heading',
			type: 'string',
			validation: (rule) => rule.required().max(40),
		}),
		defineField({
			name: 'connectHeading',
			title: 'Footer heading',
			description: 'Above the contact links in the footer.',
			type: 'string',
			validation: (rule) => rule.required().max(40),
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
