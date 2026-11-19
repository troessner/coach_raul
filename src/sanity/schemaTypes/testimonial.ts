import { defineField, defineType } from 'sanity';

export const testimonial = defineType({
	name: 'testimonial',
	title: 'Success story',
	type: 'document',
	fields: [
		defineField({
			name: 'quote',
			description: 'Select a word to make it bold, italic, highlighted or a link.',
			type: 'richText',
			validation: (rule) => rule.required().min(1),
		}),
		defineField({
			name: 'name',
			title: 'Client name',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'photo',
			type: 'image',
			options: { hotspot: true },
			fields: [
				defineField({
					name: 'alt',
					title: 'Alt text',
					description: 'Describes the photo for screen readers. Usually just the client name.',
					type: 'string',
					validation: (rule) => rule.required(),
				}),
			],
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'order',
			title: 'Position on the page',
			type: 'number',
			validation: (rule) => rule.required().integer(),
		}),
	],
	orderings: [{ title: 'Page order', name: 'pageOrder', by: [{ field: 'order', direction: 'asc' }] }],
	preview: {
		select: { title: 'name', quote: 'quote', media: 'photo' },
		// The quote is blocks now, and a block array rendered as a subtitle reads
		// "[object Object]". Flattened to its spans for the list.
		prepare: ({ title, quote, media }) => ({
			title,
			subtitle: Array.isArray(quote)
				? quote
						.flatMap((block) => (Array.isArray(block?.children) ? block.children : []))
						.map((span) => span?.text ?? '')
						.join('')
				: (quote ?? ''),
			media,
		}),
	},
});
