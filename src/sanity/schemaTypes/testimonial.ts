import { defineField, defineType } from 'sanity';

export const testimonial = defineType({
	name: 'testimonial',
	title: 'Success story',
	type: 'document',
	fields: [
		defineField({
			name: 'quote',
			type: 'text',
			rows: 4,
			validation: (rule) => rule.required(),
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
	preview: { select: { title: 'name', subtitle: 'quote', media: 'photo' } },
});
