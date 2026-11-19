import { describe, expect, it } from 'vitest';
import { convert } from '../scripts/migrate-rich-text.mjs';

/**
 * The migration rewrites real content in the production dataset, so the rule
 * for what it rewrites is worth pinning down. An earlier version of it dropped
 * an empty trailing paragraph from the bio, because it filtered falsy values
 * out of every block rather than only out of a block it was splitting.
 */
const text = (blocks: unknown): string[] =>
	(blocks as { children: { text: string }[] }[]).map((b) => b.children[0].text);

describe('converting the original shapes', () => {
	it('turns a string into one block', () => {
		expect(text(convert('It worked.'))).toEqual(['It worked.']);
	});

	it('turns an array of strings into one block each', () => {
		expect(text(convert(['Hi,', 'I am Raul.']))).toEqual(['Hi,', 'I am Raul.']);
	});

	it('splits a blank line into separate paragraphs', () => {
		// These were `text` inputs, so a blank line is how a paragraph break was
		// written. It never rendered — HTML collapses whitespace — but the intent
		// is in the data and Portable Text can carry it.
		expect(text(convert('First.\n\nSecond.'))).toEqual(['First.', 'Second.']);
	});

	it('collapses a single newline to a space, as the page always did', () => {
		expect(text(convert('One\nparagraph.'))).toEqual(['One paragraph.']);
	});

	it('keeps an empty entry as an empty paragraph', () => {
		// Dropping it would be the migration quietly editing the content.
		expect(text(convert(['Hi,', '']))).toEqual(['Hi,', '']);
	});
});

describe('content that is already converted', () => {
	const block = (value: string, marks: string[] = []) => ({
		_type: 'block',
		_key: 'k1',
		style: 'normal',
		markDefs: [],
		children: [{ _type: 'span', _key: 's1', text: value, marks }],
	});

	it('leaves one-paragraph-per-block content alone', () => {
		expect(convert([block('Hi,'), block('I am Raul.')])).toBeNull();
	});

	it('leaves an empty paragraph in place rather than dropping it', () => {
		// The exact bug this test exists for: the bio ends with an empty block.
		expect(convert([block('Hi,'), block('')])).toBeNull();
	});

	it('splits a block that still holds a paragraph break', () => {
		// Left by the first migration run, which packed the whole string into one.
		expect(text(convert([block('First.\n\nSecond.')]))).toEqual(['First.', 'Second.']);
	});

	it('never touches a block an editor has formatted', () => {
		// Splitting it would have to decide which half keeps the mark, so it does
		// not split at all. Someone's bold word outranks a tidier paragraph break.
		expect(convert([block('First.\n\nSecond.', ['strong'])])).toBeNull();
	});

	it('leaves a block carrying a link annotation alone', () => {
		const linked = {
			...block('First.\n\nSecond.'),
			markDefs: [{ _type: 'link', _key: 'l1', href: 'https://example.com/' }],
		};

		expect(convert([linked])).toBeNull();
	});
});
