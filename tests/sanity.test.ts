import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These cover the two guards that decide whether a misconfigured CMS fails
 * loudly or ships a hollow page. Everything else in src/lib/sanity.ts is GROQ
 * against a live dataset, which belongs in the build, not in a unit test.
 */
describe('sanity configuration guards', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.unstubAllEnvs();
	});

	it('refuses to load without a project id, naming the variable', async () => {
		vi.stubEnv('PUBLIC_SANITY_PROJECT_ID', '');

		// A silent fallback here is the failure this exists to prevent: the build
		// would succeed and publish a page with no content behind the headings.
		await expect(import('../src/lib/sanity')).rejects.toThrow(/PUBLIC_SANITY_PROJECT_ID is not set/);
	});

	it('reads a present variable', async () => {
		vi.stubEnv('PUBLIC_SANITY_PROJECT_ID', 'abc123');
		const { requireEnv } = await import('../src/lib/sanity');

		expect(requireEnv({ PUBLIC_SANITY_PROJECT_ID: 'abc123' }, 'PUBLIC_SANITY_PROJECT_ID')).toBe('abc123');
	});

	it('treats an empty string as missing, not as a value', async () => {
		vi.stubEnv('PUBLIC_SANITY_PROJECT_ID', 'abc123');
		const { requireEnv } = await import('../src/lib/sanity');

		// An unset var in a .env file reads as '', which would otherwise sail
		// through and fail later as an opaque 404 from the Sanity API.
		expect(() => requireEnv({ PUBLIC_SANITY_DATASET: '' }, 'PUBLIC_SANITY_DATASET')).toThrow(
			/PUBLIC_SANITY_DATASET is not set/,
		);
	});

	it('rejects an empty result set instead of rendering an empty section', async () => {
		vi.stubEnv('PUBLIC_SANITY_PROJECT_ID', 'abc123');
		const { requireRows } = await import('../src/lib/sanity');

		expect(() => requireRows([], 'services')).toThrow(/no services/);
		expect(requireRows([{ title: 'Personal Training' }], 'services')).toHaveLength(1);
	});
});
