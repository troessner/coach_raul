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

const dryRun = process.argv.includes('--dry-run');

const required = (name) => {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set.`);
	return value;
};

const client = createClient({
	projectId: required('PUBLIC_SANITY_PROJECT_ID'),
	dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
	token: required('SANITY_WRITE_TOKEN'),
	apiVersion: '2026-10-30',
	useCdn: false,
	// `raw` so drafts are visible; the default published perspective filters
	// them out of query results entirely.
	perspective: 'raw',
});

/** One plain string becomes one ordinary paragraph. */
const toBlock = (text) => ({
	_type: 'block',
	_key: randomUUID().slice(0, 12),
	style: 'normal',
	markDefs: [],
	children: [{ _type: 'span', _key: randomUUID().slice(0, 12), text, marks: [] }],
});

const isPlainString = (value) => typeof value === 'string';

/** Returns blocks for a field still holding strings, or null if it is already converted. */
const convert = (value) => {
	if (isPlainString(value)) return [toBlock(value)];
	if (Array.isArray(value) && value.every(isPlainString)) return value.map(toBlock);

	return null;
};

const run = async () => {
	const docs = await client.fetch(`*[_type in ["siteSettings", "testimonial"]]{_id, _type, bioParagraphs, quote}`);

	const patches = [];

	for (const doc of docs) {
		const field = doc._type === 'siteSettings' ? 'bioParagraphs' : 'quote';
		const converted = convert(doc[field]);

		if (!converted) {
			console.log(`skip  ${doc._id} (${field} already rich text, or empty)`);
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

run().catch((error) => {
	console.error(`\nMigration failed: ${error.message}`);
	process.exitCode = 1;
});
