/**
 * Operator details for the Impressum, the Datenschutzerklärung and the
 * contact links in the footer.
 *
 * TODO: every `TODO:` value below has to be Raul's real data before launch.
 * § 5 DDG requires a natural person's full name and a physical address — a PO
 * box is not enough — plus a phone number and an email address. Getting this
 * wrong is the single most reliably abgemahnt mistake on a German site.
 */
export const operator = {
	name: 'Raul Payares',
	street: 'TODO: Straße und Hausnummer',
	city: 'TODO: PLZ Berlin',
	country: 'Deutschland',
	phone: 'TODO: Telefonnummer',
	email: 'TODO: E-Mail-Adresse',
	// Only if Raul is actually umsatzsteuerpflichtig — otherwise leave null and
	// the Impressum drops the section. Kleinunternehmer nach § 19 UStG have none.
	vatId: null as string | null,
};

/**
 * `tel:` wants the number without spaces; `wa.me` wants bare digits, no `+`.
 * Both only work if `phone` above is stored in international format (+49 …),
 * so a German number written as `030 …` will produce a dead WhatsApp link.
 *
 * The `(0)` in the common German `+49 (0)30 …` form is a trunk prefix that is
 * only dialled domestically — keeping it would send the call to the wrong
 * number, so it is dropped before the digits are collected.
 *
 * These assume Raul's WhatsApp sits on the same number as his phone. Split
 * `operator.phone` into two fields if that turns out not to be true.
 */
export const telHref = (phone: string) => `tel:${phone.replace(/\(0\)/, '').replace(/\s/g, '')}`;

export const whatsAppHref = (phone: string) => `https://wa.me/${phone.replace(/\(0\)/, '').replace(/\D/g, '')}`;
