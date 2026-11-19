/**
 * The contact links the footer builds from the operator's phone number.
 *
 * The operator's details themselves live in the CMS — see the `operator`
 * singleton in src/sanity/schemaTypes/operator.ts — so that the Impressum, the
 * Datenschutzerklärung and the footer all read one document and cannot drift
 * apart. Only the two transforms stay here: they are pure, and they are what a
 * wrong number silently breaks.
 */

/**
 * `tel:` wants the number without spaces; `wa.me` wants bare digits, no `+`.
 * Both only work if the number is stored in international format (+49 …), so a
 * German number written as `030 …` produces a dead WhatsApp link. The operator
 * schema rejects a number that does not start with `+` for that reason.
 *
 * The `(0)` in the common German `+49 (0)30 …` form is a trunk prefix that is
 * only dialled domestically — keeping it would send the call to the wrong
 * number, so it is dropped before the digits are collected.
 *
 * These assume Raul's WhatsApp sits on the same number as his phone. Split the
 * operator's `phone` into two fields if that turns out not to be true.
 */
export const telHref = (phone: string) => `tel:${phone.replace(/\(0\)/, '').replace(/\s/g, '')}`;

export const whatsAppHref = (phone: string) => `https://wa.me/${phone.replace(/\(0\)/, '').replace(/\D/g, '')}`;
