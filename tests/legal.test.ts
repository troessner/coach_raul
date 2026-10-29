import { describe, expect, it } from 'vitest';
import { telHref, whatsAppHref } from '../src/legal';

/**
 * A wrong number here produces a link that looks fine and silently goes
 * nowhere, so the two transforms are worth pinning down.
 */
describe('contact links', () => {
	const berlin = '+49 30 1234567';

	it('strips spaces for tel: but keeps the leading plus', () => {
		expect(telHref(berlin)).toBe('tel:+49301234567');
	});

	it('reduces the number to bare digits for wa.me', () => {
		// wa.me rejects a "+" and anything else that is not a digit.
		expect(whatsAppHref(berlin)).toBe('https://wa.me/49301234567');
	});

	it('survives the punctuation people actually write numbers with', () => {
		// The "(0)" is a domestic trunk prefix — dialling it internationally fails.
		expect(telHref('+49 (0)30 123-4567')).toBe('tel:+4930123-4567');
		expect(whatsAppHref('+49 (0)30 / 123-4567')).toBe('https://wa.me/49301234567');
	});
});
