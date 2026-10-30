/**
 * One-shot import of the copy that used to be hardcoded in index.astro, so the
 * Studio starts with the real content instead of an empty dataset.
 *
 * Run once, from the repo root, after creating the Sanity project:
 *
 *   SANITY_WRITE_TOKEN=... node scripts/seed-sanity.mjs
 *
 * The token needs Editor rights and comes from
 * https://sanity.io/manage -> API -> Tokens. It is the only real secret in this
 * project: it is never committed, never read by the site, and can be revoked
 * the moment the seed has run.
 *
 * Re-running is safe. Every document has a fixed _id and createOrReplace is
 * idempotent — but it will also discard edits made in the Studio since the last
 * run, so this is a bootstrap tool, not a sync.
 */
import { createClient } from '@sanity/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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
});

/**
 * Every outbound link is a reserved example.com address rather than '#'.
 * A '#' renders as a button that looks live and does nothing; this is visibly
 * unfinished, and tests/build-output.test.ts has a launch gate asserting none
 * of them survive to production.
 */
const PENDING = (what) => `https://example.com/pending-${what}`;

const services = [
	{
		title: 'Personal Training',
		body: "One-on-one training sessions tailored to your fitness level, goals, and lifestyle. Whether you want to build muscle, lose fat, or improve your overall fitness, I'll guide you every step of the way.",
	},
	{
		title: 'Nutrition Coaching',
		body: 'Personalized nutrition guidance to support your fitness goals, improve energy levels, and develop sustainable eating habits. No extreme diets, just a balanced approach to healthier living.',
	},
	{
		title: 'Mindset & Motivation Coaching',
		body: "Build confidence, discipline, and mental resilience. I'll help you overcome mental barriers, stay motivated, and develop the mindset needed for long-term success.",
	},
	{
		title: '90-Day Transformation Challenge',
		body: 'Ready to transform yourself in just 90 days? My structured transformation program combines strength training, functional fitness, personalized nutrition guidance, and mindset coaching to help you build muscle, improve endurance, develop healthy habits, and achieve measurable results.',
	},
];

// Canva placeholder copy, carried over so the layout has something of the right
// length in it. Raul replaces these in the Studio; it is a launch gate.
const PLACEHOLDER_QUOTE =
	"Boost your product and service's credibility by adding testimonials from your clients. People love recommendations so feedback from others who've tried it is invaluable.";

const testimonialPhotos = ['testimonial-003.png', 'testimonial-004.png', 'testimonial-005.png', 'testimonial-006.png'];

const socials = [
	{ network: 'facebook', label: 'Facebook' },
	{ network: 'x', label: 'X' },
	{ network: 'instagram', label: 'Instagram' },
	{ network: 'tiktok', label: 'TikTok' },
];

const uploadPhoto = async (filename) => {
	const path = fileURLToPath(new URL(`../src/assets/${filename}`, import.meta.url));
	const asset = await client.assets.upload('image', await readFile(path), { filename });
	return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
};

const docs = [
	{
		_id: 'siteSettings',
		_type: 'siteSettings',
		heroTitleLines: ['Get stronger', 'Get healthier'],
		heroSubLines: ['I offer personal & group training', 'designed to help you get', 'Stronger & Healthier'],
		heroCtaLabel: 'Sign up now',
		bioParagraphs: [
			'Hi,',
			"I'm Raul Payares, originally from Colombia and now based in Berlin.",
			"With over 15 years of experience in fitness and coaching, I've dedicated my career to helping people become stronger, healthier, and more confident.",
			'I specialize in strength and high intensity training, functional fitness, and mindset coaching, helping people of all fitness levels achieve lasting results.',
			"I believe fitness is more than just physical transformation. It's about building discipline, confidence, mental resilience, and a healthier lifestyle.",
			'My mission is simple: To help you build a stronger body, a stronger mind, and become the best version of yourself.',
		],
		bookingUrl: PENDING('cal-com-event'),
	},
	...services.map((service, i) => ({
		_id: `service-${i + 1}`,
		_type: 'service',
		...service,
		href: PENDING('stripe-payment-link'),
		order: i + 1,
	})),
	...socials.map((social, i) => ({
		_id: `social-${social.network}`,
		_type: 'social',
		...social,
		href: PENDING(social.network),
		order: i + 1,
	})),
];

const run = async () => {
	for (const [i, filename] of testimonialPhotos.entries()) {
		process.stdout.write(`uploading ${filename}... `);
		const photo = await uploadPhoto(filename);
		docs.push({
			_id: `testimonial-${i + 1}`,
			_type: 'testimonial',
			quote: PLACEHOLDER_QUOTE,
			name: 'Client name',
			photo: { ...photo, alt: 'Client name' },
			order: i + 1,
		});
		console.log('done');
	}

	const tx = docs.reduce((t, doc) => t.createOrReplace(doc), client.transaction());
	await tx.commit();

	console.log(`\nSeeded ${docs.length} documents into "${client.config().dataset}".`);
	console.log('They are drafts of nothing — createOrReplace publishes directly, so the site can read them now.');
	console.log('\nNext: open the Studio and replace every example.com link with a real one.');
};

run().catch((error) => {
	console.error(`\nSeed failed: ${error.message}`);
	process.exitCode = 1;
});
