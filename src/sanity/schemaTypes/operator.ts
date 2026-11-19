import { defineField, defineType } from 'sanity';

/**
 * The operator's legal identity. A singleton: sanity.config.ts pins it to the
 * document id "operator" so there can only ever be one.
 *
 * This is § 5 DDG data, not marketing copy. It fills the Impressum, the
 * Datenschutzerklärung and the footer's contact links from one document, which
 * is the point — a footer email that disagrees with the Impressum email is the
 * single most reliably abgemahnt mistake on a German site. Every field here is
 * required for that reason: a blank street is not a cosmetic gap, it is a
 * missing Pflichtangabe.
 *
 * § 5 DDG wants a natural person's full name and a physical address — a PO box
 * is not enough — plus a phone number and an email address.
 */
export const operator = defineType({
	name: 'operator',
	title: 'Legal & contact details',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Full name',
			description: 'The natural person responsible, as § 5 DDG requires. Not a brand or a trading name.',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'street',
			title: 'Street and house number',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'city',
			title: 'Postcode and city',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'country',
			title: 'Country',
			type: 'string',
			initialValue: 'Deutschland',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'phone',
			title: 'Phone number',
			description:
				'In international format, starting with +49. The footer turns this into a tel: link and a WhatsApp link by stripping everything that is not a digit, so a number written as "030 …" produces a link that dials the wrong number and a WhatsApp link that goes nowhere.',
			type: 'string',
			validation: (rule) =>
				rule.required().custom((value) => {
					if (typeof value !== 'string') return true;
					if (!value.trim().startsWith('+')) {
						return 'Must start with a country code, e.g. +49 30 1234567 — the WhatsApp and tel: links are built from this.';
					}
					// Nine is the shortest plausible international number; this is a
					// typo guard, not an E.164 validator.
					if (value.replace(/\D/g, '').length < 9) {
						return 'Looks too short for an international number — check the country code and area code are both there.';
					}
					return true;
				}),
		}),
		defineField({
			name: 'email',
			title: 'Email address',
			type: 'string',
			validation: (rule) => rule.required().email(),
		}),
		defineField({
			name: 'vatId',
			title: 'VAT ID (USt-IdNr.)',
			description:
				'Only if you are umsatzsteuerpflichtig. Leave empty as a Kleinunternehmer nach § 19 UStG — the Impressum then drops the section rather than printing an empty heading.',
			type: 'string',
		}),
	],
	preview: {
		prepare: () => ({ title: 'Legal & contact details' }),
	},
});
