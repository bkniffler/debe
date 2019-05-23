import { renderToStaticMarkup } from 'react-dom/server';
import { Cache } from 'debe-react';

export async function extractCache(
  cache: Cache,
  app: any,
  lastHtml?: string
): Promise<string> {
  const html = renderToStaticMarkup(app);
  if (!cache.hasPending()) {
    return html;
  }
  return cache.waitPending(100).then(() => extractCache(cache, app, html));
}
