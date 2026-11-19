import { describe, expect, it } from 'vitest';
import { renderRichText } from '../src/lib/richText';
import type { RichText } from '../src/lib/richText';

/**
 * The renderer turns CMS content into raw HTML that goes through `set:html`,
 * so it is the one place in this project where getting escaping or a URL
 * scheme wrong puts something executable on the page.
 */
const block = (children: unknown[]): RichText =>
	[
		{
			_type: 'block',
			_key: 'b1',
			style: 'normal',
			markDefs: [],
			children,
		},
	] as RichText;

const span = (text: string, marks: string[] = []) => ({ _type: 'span', _key: 's1', text, marks });

describe('legacy plain-text content', () => {
	// Every document in the dataset still holds these shapes until the migration
	// runs. Rendering them is what lets the deploy and the migration happen in
	// either order.
	it('renders an array of strings as one paragraph each', () => {
		const html = renderRichText(['Hi,', 'I am Raul.']);

		expect(html).toBe('<p>Hi,</p><p>I am Raul.</p>');
	});

	it('renders a bare string as a single paragraph', () => {
		expect(renderRichText('It worked.')).toBe('<p>It worked.</p>');
	});

	it('renders nothing for an absent value rather than throwing', () => {
		// Same contract as the rest of the CMS fields: a missing field is a gap,
		// not a 500.
		expect(renderRichText(null)).toBe('');
		expect(renderRichText(undefined)).toBe('');
		expect(renderRichText([])).toBe('');
	});

	it('escapes HTML in a legacy string', () => {
		// This content is interpolated with set:html, so an unescaped angle
		// bracket here is a script tag on the page.
		expect(renderRichText(['<script>alert(1)</script>'])).not.toContain('<script>');
	});
});

describe('marks', () => {
	it('renders bold and italic', () => {
		expect(renderRichText(block([span('loud', ['strong'])]))).toContain('<strong>loud</strong>');
		expect(renderRichText(block([span('soft', ['em'])]))).toContain('<em>soft</em>');
	});

	it('renders a highlight as a class the stylesheet owns', () => {
		// The colour lives in the component's CSS, not in the content — a hex in
		// the CMS would be a second place to change the palette.
		const html = renderRichText(block([span('white', ['highlight'])]));

		expect(html).toContain('<span class="rt-highlight">white</span>');
		expect(html).not.toMatch(/#[0-9a-f]{3,6}/i);
	});

	it('escapes HTML inside a marked span', () => {
		const html = renderRichText(block([span('<img src=x onerror=alert(1)>', ['strong'])]));

		expect(html).not.toContain('<img');
	});
});

describe('links', () => {
	const linked = (href: unknown): RichText =>
		[
			{
				_type: 'block',
				_key: 'b1',
				style: 'normal',
				markDefs: [{ _type: 'link', _key: 'l1', href }],
				children: [{ _type: 'span', _key: 's1', text: 'click', marks: ['l1'] }],
			},
		] as RichText;

	it('renders an external link with rel and target', () => {
		const html = renderRichText(linked('https://example.com/'));

		expect(html).toContain('href="https://example.com/"');
		// Reverse tabnabbing: without it the opened tab can navigate this one.
		expect(html).toContain('rel="noopener noreferrer"');
		expect(html).toContain('target="_blank"');
	});

	it('leaves mailto and tel links in the same tab', () => {
		// Opening a mail client in a new browser tab strands an empty tab behind.
		for (const href of ['mailto:raul@example.com', 'tel:+49301234567']) {
			const html = renderRichText(linked(href));

			expect(html).toContain(`href="${href}"`);
			expect(html).not.toContain('target="_blank"');
		}
	});

	it('drops a javascript: href and keeps the text', () => {
		// The reason this file exists. An editor — or anyone who reaches the
		// dataset — must not be able to put script into a page through a link.
		const html = renderRichText(linked('javascript:alert(1)'));

		expect(html).not.toContain('javascript:');
		expect(html).not.toContain('<a');
		expect(html).toContain('click');
	});

	it('drops a link whose href is missing or not a string', () => {
		for (const href of [undefined, null, 42, { toString: () => 'https://evil.test' }]) {
			const html = renderRichText(linked(href));

			expect(html).not.toContain('<a');
			expect(html).toContain('click');
		}
	});

	it('cannot break out of the href attribute', () => {
		const html = renderRichText(linked('https://example.com/"onmouseover="alert(1)'));

		expect(html).not.toContain('onmouseover="alert(1)"');
	});
});
