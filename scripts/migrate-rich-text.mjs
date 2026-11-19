/**
 * Converts the bio and the story quotes from plain strings to Portable Text,
 * which is what the `richText` fields hold since those two became formattable.
 *
 * The site does not need this: src/lib/richText.ts renders the old strings as
 * ordinary paragraphs, so pages are correct before and after. The Studio does
 * — a Portable Text input handed a string shows the field as invalid, and Raul
 * would open the bio to an error instead of his text.
 *
 * Run from the repo root, with an Editor token:
 *
 *   SANITY_WRITE_TOKEN=... node scripts/migrate-rich-text.mjs
 *
 * Idempotent: anything already converted is skipped, so re-running is safe.
 * Pass --dry-run to see what it would touch without writing.
 *
 * Drafts are migrated too. A draft shadows its published document completely
 * in preview, so converting only the published copy leaves the Studio's own
 * preview rendering the unconverted draft.
 */
import { createClient } from '@sanity/client';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const required = (name) => {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set.`);
	return value;
};

// Built inside run() rather than at import: `convert` is unit-tested, and a
// client constructed at module scope would demand a token just to import it.
const makeClient = () =>
	createClient({
		projectId: required('PUBLIC_SANITY_PROJECT_ID'),
		dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
		token: required('SANITY_WRITE_TOKEN'),
		apiVersion: '2026-10-30',
		useCdn: false,
		// `raw` so drafts are visible; the default published perspective filters
		// them out of query results entirely.
		perspective: 'raw',
	});

/** One paragraph of text becomes one block. */
const toBlock = (text) => ({
	_type: 'block',
	_key: randomUUID().slice(0, 12),
	style: 'normal',
	markDefs: [],
	children: [{ _type: 'span', _key: randomUUID().slice(0, 12), text, marks: [] }],
});

/**
 * One string becomes one block per paragraph.
 *
 * The old fields were `text` inputs, so a blank line is how someone wrote a
 * paragraph break in them. It never rendered — HTML collapses whitespace, and
 * the quote was interpolated straight into a <blockquote> — but the intent is
 * in the data, and Portable Text can finally express it. Single newlines
 * collapse to a space, which is what they already did on the page.
 */
const toBlocks = (text) => {
	const paragraphs = text
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
		.filter(Boolean);

	// Never return nothing: an entry that is empty, or only whitespace, stays an
	// empty paragraph rather than disappearing. Dropping it would be this script
	// quietly editing the content it was asked to re-shape.
	return (paragraphs.length ? paragraphs : ['']).map(toBlock);
};

const isPlainString = (value) => typeof value === 'string';

/** A freshly converted block: one unmarked span, nothing an editor has styled yet. */
const isUnmarkedBlock = (block) =>
	block?._type === 'block' &&
	Array.isArray(block.children) &&
	block.children.length === 1 &&
	block.children[0]?._type === 'span' &&
	(block.children[0].marks ?? []).length === 0 &&
	(block.markDefs ?? []).length === 0;

/**
 * Returns the blocks a field should hold, or null if it already holds them.
 *
 * Handles three shapes: the original string, the original array of strings,
 * and blocks produced by an earlier run of this script that packed a
 * blank-line paragraph break into a single block. The third case only splits
 * blocks that carry no marks — anything an editor has already formatted is
 * left exactly as it is, because splitting it would drop the formatting.
 */
export const convert = (value) => {
	if (isPlainString(value)) return toBlocks(value);
	if (Array.isArray(value) && value.every(isPlainString)) return value.flatMap(toBlocks);

	if (Array.isArray(value) && value.every(isUnmarkedBlock)) {
		let changed = false;

		const split = value.flatMap((block) => {
			const text = block.children[0]?.text ?? '';

			// Only a block that actually contains a paragraph break is rewritten.
			// Everything else is passed through as the same object, so its _key
			// survives and an empty paragraph stays an empty paragraph.
			if (!/\n\s*\n/.test(text)) return [block];

			changed = true;
			return toBlocks(text);
		});

		return changed ? split : null;
	}

	return null;
};

const run = async () => {
	const dryRun = process.argv.includes('--dry-run');
	const client = makeClient();
	const docs = await client.fetch(`*[_type in ["siteSettings", "testimonial"]]{_id, _type, bioParagraphs, quote}`);

	const patches = [];

	for (const doc of docs) {
		const field = doc._type === 'siteSettings' ? 'bioParagraphs' : 'quote';
		const converted = convert(doc[field]);

		if (!converted) {
			console.log(`skip  ${doc._id} (${field} already one block per paragraph, formatted, or empty)`);
			continue;
		}

		console.log(`${dryRun ? 'would ' : ''}patch ${doc._id} (${field}: ${converted.length} block(s))`);
		patches.push({ id: doc._id, field, converted });
	}

	if (dryRun || patches.length === 0) {
		console.log(`\n${patches.length} document(s) ${dryRun ? 'would be' : ''} converted.`);
		return;
	}

	const tx = patches.reduce(
		(t, { id, field, converted }) => t.patch(id, (p) => p.set({ [field]: converted })),
		client.transaction(),
	);

	await tx.commit();
	console.log(`\nConverted ${patches.length} document(s).`);
};

// Only when executed, not when imported by the test that covers `convert`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	run().catch((error) => {
		console.error(`\nMigration failed: ${error.message}`);
		process.exitCode = 1;
	});
}
