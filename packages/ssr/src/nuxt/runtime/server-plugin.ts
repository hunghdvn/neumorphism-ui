import { transformHtml } from '../../transform-html.js';

/** The parts of Nuxt's render:html context that can hold component markup. */
interface RenderHtmlContext {
  /** Includes `<Teleport to="body">` output. */
  bodyPrepend: string[];
  body: string[];
  bodyAppend: string[];
}

interface NitroAppLike {
  hooks: { hook(name: 'render:html', fn: (html: RenderHtmlContext) => void): void };
}

const transformAll = (chunks: string[]) => chunks.map((chunk) => transformHtml(chunk));

/** A Nitro plugin is a plain function; defineNitroPlugin is only an identity helper. */
export default function neuUiNitroPlugin(nitroApp: NitroAppLike): void {
  nitroApp.hooks.hook('render:html', (html) => {
    html.bodyPrepend = transformAll(html.bodyPrepend);
    html.body = transformAll(html.body);
    html.bodyAppend = transformAll(html.bodyAppend);
  });
}
