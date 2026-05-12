import type { RequestHandler } from './$types';

const SITE_URL = 'https://whichrouteisfaster.com';

const pages = ['', '/policies'];

export const GET: RequestHandler = () => {
	const urls = pages
		.map(
			(path) => `	<url>
		<loc>${SITE_URL}${path}</loc>
	</url>`
		)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
