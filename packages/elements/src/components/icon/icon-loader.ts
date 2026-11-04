import { getIconLibrary } from './icon-registry.js';
import { systemIconSvg } from './system-icons.js';

/** Sanitized markup by URL; the promise is shared so one URL is fetched once. */
const cache = new Map<string, Promise<string | null>>();
/** The latest request per container; a response for an older one is dropped. */
const tokens = new WeakMap<Element, number>();
let parser: DOMParser | undefined;
let counter = 0;

/** Browsers ignore whitespace and control characters inside a URL scheme, so drop them first. */
const isScriptUrl = (value: string) =>
  [...value]
    .filter((char) => char > ' ')
    .join('')
    .toLowerCase()
    .startsWith('javascript:');

/** Parses SVG text and strips script, foreignObject, on* attributes and javascript: links. */
function sanitize(text: string): string | null {
  parser ??= new DOMParser();
  const svg = parser.parseFromString(text, 'image/svg+xml').documentElement;
  if (svg.localName !== 'svg' || svg.querySelector('parsererror')) return null;
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    if (/^(script|foreignobject)$/i.test(el.localName)) {
      el.remove();
      continue;
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || (/(^|:)href$/.test(name) && isScriptUrl(attr.value))) {
        el.removeAttribute(attr.name);
      }
    }
  }
  svg.setAttribute('part', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return new XMLSerializer().serializeToString(svg);
}

function load(url: string): Promise<string | null> {
  let entry = cache.get(url);
  if (!entry) {
    entry = (async () => {
      try {
        const response = await fetch(url);
        return response.ok ? sanitize(await response.text()) : null;
      } catch {
        return null;
      }
    })();
    cache.set(url, entry);
    // A failure is not remembered, so the next request can try again.
    void entry.then((markup) => markup === null && cache.delete(url));
  }
  return entry;
}

/**
 * Fills `container` with the icon: the system set at once, other libraries asynchronously.
 * Unknown names, a throwing library and failed loads leave it empty. Never throws.
 */
export function renderIconInto(container: Element, library: string, name: string): void {
  const token = ++counter;
  tokens.set(container, token);
  const show = (markup: string | null | undefined) => {
    if (tokens.get(container) === token) container.innerHTML = markup ?? '';
  };
  if (library === 'system') return show(systemIconSvg(name));
  let source: string;
  try {
    const resolved = getIconLibrary(library)?.resolve(name);
    if (resolved === undefined) return show(null);
    source = String(resolved);
  } catch {
    return show(null);
  }
  if (source.trim().startsWith('<')) {
    try {
      return show(sanitize(source.trim()));
    } catch {
      return show(null);
    }
  }
  void load(source).then(show);
}
