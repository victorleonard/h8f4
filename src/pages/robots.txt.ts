import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  const noindex = import.meta.env.PUBLIC_NOINDEX === 'true';
  const site = import.meta.env.SITE.replace(/\/$/, '');

  const body = noindex
    ? 'User-agent: *\nDisallow: /'
    : `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap-index.xml`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
