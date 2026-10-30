import { defineField, defineType } from 'sanity';

export const service = defineType({
	name: 'service',
	title: 'Service',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'body',
			type: 'text',
			rows: 5,
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'href',
			title: 'Stripe Payment Link',
			type: 'url',
			validation: (rule) => rule.required().uri({ scheme: ['https'] }),
		}),
		defineField({
			name: 'order',
			title: 'Position on the page',
			description: 'Low numbers first. Sanity has no inherent document order, so this is what the grid sorts on.',
			type: 'number',
			validation: (rule) => rule.required().integer(),
		}),
	],
	orderings: [{ title: 'Page order', name: 'pageOrder', by: [{ field: 'order', direction: 'asc' }] }],
	preview: { select: { title: 'title', subtitle: 'order' } },
});
