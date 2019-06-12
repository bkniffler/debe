import { renderToStaticMarkup } from 'react-dom/server';
import { awaitLoaded, getUnloadedKeys } from 'debe-react';

export async function extractCache(store: any, app: any): Promise<string> {
  const html = renderToStaticMarkup(app);
  const keys = getUnloadedKeys(store);
  if (keys.length === 0) {
    return html;
  }
  await awaitLoaded(store, keys);
  return extractCache(store, app);
}
