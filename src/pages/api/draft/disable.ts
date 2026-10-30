import type { APIRoute } from 'astro';
import { DRAFT_COOKIE } from '../../../lib/sanity';

export const prerender = false;

/** Leaves preview. Needs no secret — switching back to published is always safe. */
export const GET: APIRoute = ({ cookies, redirect }) => {
	cookies.delete(DRAFT_COOKIE, { path: '/' });

	return redirect('/', 307);
};
