import { defineMiddleware } from 'astro:middleware';
import { transformHtml } from '@neumorphism-ui/ssr';

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;

  const html = transformHtml(await response.text());
  // The transformed body is longer than the original, so the old length must go.
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
