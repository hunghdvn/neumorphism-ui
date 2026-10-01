import { transformHtml } from '../../transform-html.js';

interface RenderHtmlContext {
  body: string[];
}

interface NitroAppLike {
  hooks: { hook(name: 'render:html', fn: (html: RenderHtmlContext) => void): void };
}

/** A Nitro plugin is a plain function; defineNitroPlugin is only an identity helper. */
export default function neuUiNitroPlugin(nitroApp: NitroAppLike): void {
  nitroApp.hooks.hook('render:html', (html) => {
    html.body = html.body.map((chunk) => transformHtml(chunk));
  });
}
