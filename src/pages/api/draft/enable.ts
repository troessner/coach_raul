import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { DRAFT_COOKIE, getClient } from '../../../lib/sanity';

export const prerender = false;

/**
 * Turns on draft rendering for this browser.
 *
 * Sanity's Presentation tool mints a single-use secret, stores it in the
 * dataset and appends it to this URL. Validating it against the dataset is what
 * stops the route being an open switch for serving unpublished content to
 * anyone who guesses the path.
 */
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
	const { isValid, redirectTo = '/' } = await validatePreviewUrl(getClient(true), request.url);

	if (!isValid) {
		return new Response('Invalid or expired preview link.', { status: 401 });
	}

	cookies.set(DRAFT_COOKIE, 'true', {
		path: '/',
		// Not readable from JS: nothing in the browser needs it, and the page is
		// rendered on the server where the cookie is read.
		httpOnly: true,
		sameSite: 'lax',
		// Dev runs on http, where a Secure cookie is simply dropped.
		secure: import.meta.env.PROD,
		// Preview sessions expire rather than persisting on a shared machine.
		maxAge: 60 * 60,
	});

	return redirect(redirectTo, 307);
};
