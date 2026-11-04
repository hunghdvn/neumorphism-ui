import { getIconLibrary } from './icon-registry.js';
import { systemIconSvg } from './system-icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Static shapes, paint servers and structure only. Case matters: XML names are case-sensitive. */
const ALLOWED = new Set(
  'svg g path circle ellipse line polyline polygon rect defs title desc symbol linearGradient radialGradient stop clipPath mask use'.split(
    ' ',
  ),
);

/** Sanitized SVG elements by URL; the promise is shared so one URL is fetched once. */
const cache = new Map<string, Promise<Element | null>>();
/** The latest request per container; a response for an older one is dropped. */
const tokens = new WeakMap<Element, number>();
let parser: DOMParser | undefined;
let counter = 0;

/** Allowlist walk: keeps allowed SVG elements and text, drops everything else. */
function clean(parent: Element): void {
  for (const node of [...parent.childNodes]) {
    if (node.nodeType === 3) continue;
    if (
      node.nodeType !== 1 ||
      (node as Element).namespaceURI !== SVG_NS ||
      !ALLOWED.has((node as Element).localName)
    ) {
      node.remove();
      continue;
    }
    const el = node as Element;
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || (/(^|:)href$/.test(name) && !attr.value.startsWith('#'))) {
        el.removeAttribute(attr.name);
      }
    }
    clean(el);
  }
}

/**
 * Parses SVG text as XML and returns the cleaned root, or null. The result is only ever inserted
 * as nodes, never serialized back into HTML, so no parser differential can reintroduce markup.
 */
function sanitize(text: string): Element | null {
  parser ??= new DOMParser();
  const source = text.replace(/<svg\b(?![^>]*\sxmlns\s*=)/, `<svg xmlns="${SVG_NS}"`);
  const svg = parser.parseFromString(source, 'image/svg+xml').documentElement;
  if (svg.namespaceURI !== SVG_NS || svg.localName !== 'svg' || svg.querySelector('parsererror')) {
    return null;
  }
  clean(svg);
  svg.removeAttribute('xmlns:xlink');
  for (const attr of [...svg.attributes]) {
    if (attr.name.toLowerCase().startsWith('on')) svg.removeAttribute(attr.name);
  }
  svg.setAttribute('part', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

function load(url: string): Promise<Element | null> {
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
    void entry.then((svg) => svg === null && cache.delete(url));
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
  const show = (svg: Element | null) => {
    if (tokens.get(container) !== token) return;
    container.replaceChildren(...(svg ? [container.ownerDocument.importNode(svg, true)] : []));
  };
  if (library === 'system') {
    // Constant, library-owned markup.
    container.innerHTML = systemIconSvg(name) ?? '';
    return;
  }
  let source: string;
  try {
    const resolved = name ? getIconLibrary(library)?.resolve(name) : undefined;
    if (resolved == null) return show(null);
    source = String(resolved).trim();
  } catch {
    return show(null);
  }
  if (source.startsWith('<')) {
    try {
      return show(sanitize(source));
    } catch {
      return show(null);
    }
  }
  void load(source).then(show);
}
