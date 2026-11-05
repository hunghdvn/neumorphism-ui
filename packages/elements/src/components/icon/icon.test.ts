import { afterEach, describe, expect, test, vi } from 'vitest';
import { NeuIcon } from '../../icon.js';
import { registerIconLibrary } from '../../icons.js';
import { renderDSD } from '../../ssr.js';
import { axeViolations, internalsOf, mount, tick } from '../../test-utils/helpers.js';
import { systemIconSvg } from './system-icons.js';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const DIRTY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" onload="x()" ONLOAD="x()">' +
  '<script>alert(1)</script><SCRIPT>alert(1)</SCRIPT><foreignObject><div>hi</div></foreignObject>' +
  '<a href="javascript:x"><path onclick="y()" d="M1 1h4"/></a>' +
  '<a xlink:href=" JavaScript:x"><circle cx="1" cy="1" r="1"/></a>' +
  '<path id="keep" d="M2 2h4"/></svg>';

function stubFetch(body: string | ((url: string) => Promise<Response>)) {
  const fn = vi.fn(async (input: RequestInfo | URL) =>
    typeof body === 'string' ? new Response(body) : body(String(input)),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

const box = (el: Element) => el.shadowRoot!.querySelector('.box')!;
const svgOf = (el: Element) => box(el).querySelector('svg');
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

/**
 * Records changes to the element's icon box from now on; read them with the returned function.
 * Only the box is watched: adopting a server root also removes its SSR style element.
 */
function watch(el: Element): () => MutationRecord[] {
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(box(el), {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  return () => {
    records.push(...observer.takeRecords());
    observer.disconnect();
    return records;
  };
}

const HIT = '__neuIconHit';
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const hit = `onerror="window.${HIT}=1"`;
const PAYLOADS: Record<string, string> = {
  'empty-comment breakout': `<svg ${NS}><!--></svg><img src="x" ${hit}>--></svg>`,
  'processing instruction': `<svg ${NS}><?x > <img src="x" ${hit}> ?></svg>`,
  'CDATA in html element': `<svg ${NS}><p><![CDATA[><img src="x" ${hit}>]]></p></svg>`,
  'iframe srcdoc': `<svg ${NS}><p><iframe srcdoc="&lt;script&gt;window.${HIT}=1&lt;/script&gt;"/></p></svg>`,
  'SMIL set': `<svg ${NS}><a><set attributeName="href" to="javascript:window.${HIT}=1"/></a><path d="M1 1"/></svg>`,
  'SMIL animate': `<svg ${NS}><path d="M1 1"><animate attributeName="d" to="M2 2"/></path></svg>`,
  'external use': `<svg ${NS}><use href="data:image/svg+xml,&lt;svg/&gt;"/><use href="#ok"/></svg>`,
  'no-namespace root': `<svg><style>*{}</style><image href="x"/><path d="M1 1"/></svg>`,
};

describe('neu-icon', () => {
  test('renders the system icon in the template', () => {
    const el = mount<NeuIcon>('<neu-icon name="check"></neu-icon>');
    expect(el.shadowRoot!.querySelector('svg[part=svg]')).not.toBeNull();
    expect(svgOf(el)!.querySelector('path')!.getAttribute('d')).toBe('M5 12.5l4.5 4.5L19 7.5');
    expect(mount('<neu-icon name="nope"></neu-icon>').shadowRoot!.querySelector('svg')).toBeNull();
    expect(mount('<neu-icon></neu-icon>').shadowRoot!.querySelector('svg')).toBeNull();
  });

  test('systemIconSvg knows the eight system icons and ignores prototype names', () => {
    const names = [
      'check',
      'chevron-down',
      'chevron-up',
      'plus',
      'minus',
      'x',
      'alert-circle',
      'user',
    ];
    for (const name of names) {
      expect(systemIconSvg(name)).toMatch(/^<svg part="svg" viewBox="0 0 24 24"/);
    }
    expect(systemIconSvg('constructor')).toBeUndefined();
    expect(systemIconSvg('')).toBeUndefined();
  });

  test('defaults, attribute and property stay in step', () => {
    const el = mount<NeuIcon>('<neu-icon></neu-icon>');
    expect([el.name, el.library, el.label]).toEqual(['', 'system', '']);
    el.name = 'plus';
    expect(el.getAttribute('name')).toBe('plus');
    expect(svgOf(el)!.querySelector('path')!.getAttribute('d')).toBe('M12 5v14M5 12h14');
    el.setAttribute('name', 'minus');
    expect(el.name).toBe('minus');
    expect(svgOf(el)!.querySelector('path')!.getAttribute('d')).toBe('M5 12h14');
    el.label = 'Minus';
    expect(el.getAttribute('label')).toBe('Minus');
    el.removeAttribute('name');
    expect(el.name).toBe('');
    expect(svgOf(el)).toBeNull();
  });

  test('removing the library attribute falls back to the system library', () => {
    const el = mount<NeuIcon>('<neu-icon name="check" library="other"></neu-icon>');
    expect(svgOf(el)).toBeNull();
    el.removeAttribute('library');
    expect(el.library).toBe('system');
    expect(svgOf(el)).not.toBeNull();
  });

  test('label gives role img and a name; no label hides it', () => {
    const el = mount<NeuIcon>('<neu-icon name="user"></neu-icon>');
    expect(internalsOf(el).role).toBeNull();
    expect(internalsOf(el).ariaHidden).toBe('true');
    el.label = 'Profile';
    expect(internalsOf(el).role).toBe('img');
    expect(internalsOf(el).ariaLabel).toBe('Profile');
    expect(internalsOf(el).ariaHidden).toBeNull();
    el.label = '';
    expect(internalsOf(el).role).toBeNull();
    expect(internalsOf(el).ariaHidden).toBe('true');
  });

  test('has no axe violations, labelled or decorative', async () => {
    const labelled = mount<NeuIcon>('<neu-icon name="check" label="Done"></neu-icon>');
    const decorative = mount<NeuIcon>('<neu-icon name="check"></neu-icon>');
    expect(await axeViolations(labelled)).toEqual([]);
    expect(await axeViolations(decorative)).toEqual([]);
  });

  test('URL libraries are fetched once, sanitized and cached', async () => {
    const fetchMock = stubFetch(DIRTY_SVG);
    registerIconLibrary('t-url', { resolve: (name) => `/icons/${name}.svg` });
    const a = mount<NeuIcon>('<neu-icon library="t-url" name="a"></neu-icon>');
    const b = mount<NeuIcon>('<neu-icon library="t-url" name="a"></neu-icon>');
    await vi.waitFor(() => expect(svgOf(a)).not.toBeNull());
    await vi.waitFor(() => expect(svgOf(b)).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('/icons/a.svg');
    for (const el of [a, b]) {
      const svg = svgOf(el)!;
      expect(svg.getAttribute('part')).toBe('svg');
      expect(svg.querySelector('script, foreignObject')).toBeNull();
      expect(svg.outerHTML.toLowerCase()).not.toContain('javascript:');
      expect(svg.outerHTML).not.toContain('onload');
      expect(svg.outerHTML).not.toContain('onclick');
      expect(svg.querySelector('#keep')).not.toBeNull();
    }
  });

  test('string markup from resolve is sanitized the same way', async () => {
    const fetchMock = stubFetch('');
    registerIconLibrary('t-markup', { resolve: () => `  ${DIRTY_SVG}` });
    const el = mount<NeuIcon>('<neu-icon library="t-markup" name="a"></neu-icon>');
    await vi.waitFor(() => expect(svgOf(el)).not.toBeNull());
    const svg = svgOf(el)!;
    expect(svg.getAttribute('part')).toBe('svg');
    expect(svg.querySelector('script, foreignObject')).toBeNull();
    expect(svg.outerHTML.toLowerCase()).not.toContain('javascript:');
    expect(svg.outerHTML).not.toContain('onload');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('style and non-local url() references are dropped; local url(#id) survives', async () => {
    const markup =
      `<svg ${NS} style="background:url(https://t.example/a)" filter="url(https://t.example/f.svg#a)">` +
      '<defs><linearGradient id="g"><stop offset="0"/></linearGradient><clipPath id="c"><rect width="4" height="4"/></clipPath></defs>' +
      `<path id="p" d="M1 1h4" style="fill:red" mask="url( 'https://t.example/m.svg#a')" fill="url('#g')" clip-path="url(#c)" cursor="\\75rl(https://t.example/c)" stroke="URL(//t.example/s)"/>` +
      '<rect id="r" width="1" height="1" fill="-webkit-image-set(&quot;https://t.example/i.png&quot; 1x)"/></svg>';
    registerIconLibrary('t-url-attrs', { resolve: () => markup });
    const el = mount<NeuIcon>('<neu-icon library="t-url-attrs" name="a"></neu-icon>');
    await vi.waitFor(() => expect(svgOf(el)).not.toBeNull());
    const svg = svgOf(el)!;
    expect(svg.outerHTML).not.toContain('t.example');
    expect(svg.hasAttribute('style')).toBe(false);
    expect(svg.hasAttribute('filter')).toBe(false);
    const path = svg.querySelector('#p')!;
    expect(path.hasAttribute('style')).toBe(false);
    expect(path.getAttribute('fill')).toBe("url('#g')");
    expect(path.getAttribute('clip-path')).toBe('url(#c)');
    expect(path.getAttribute('d')).toBe('M1 1h4');
    expect(svg.querySelector('#r')!.hasAttribute('fill')).toBe(false);
  });

  test('re-registering a library updates icons already rendered', async () => {
    const svg = (d: string) => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
    const d = (el: Element) => svgOf(el)?.querySelector('path')?.getAttribute('d');
    registerIconLibrary('t-rereg', { resolve: () => svg('M1 1') });
    const el = mount<NeuIcon>('<neu-icon library="t-rereg" name="a"></neu-icon>');
    await vi.waitFor(() => expect(d(el)).toBe('M1 1'));
    registerIconLibrary('t-rereg', { resolve: () => svg('M2 2') });
    await vi.waitFor(() => expect(d(el)).toBe('M2 2'));
    el.remove();
    registerIconLibrary('t-rereg', { resolve: () => svg('M3 3') });
    await settle();
    expect(d(el)).toBe('M2 2');
    // Back in the page it catches up; a plain move afterwards redraws nothing.
    document.body.append(el);
    await vi.waitFor(() => expect(d(el)).toBe('M3 3'));
    const writes = watch(el);
    mount('<div></div>').append(el);
    await settle();
    expect(writes()).toEqual([]);
  });

  test('registering a library named system is ignored', async () => {
    const el = mount<NeuIcon>('<neu-icon name="check"></neu-icon>');
    const writes = watch(el);
    registerIconLibrary('system', { resolve: () => '<svg><path d="M9 9"/></svg>' });
    await settle();
    expect(writes()).toEqual([]);
    expect(svgOf(el)!.querySelector('path')!.getAttribute('d')).toBe('M5 12.5l4.5 4.5L19 7.5');
  });

  test('hydration and later moves keep the server-rendered system icon', async () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.setHTMLUnsafe(
      `<neu-icon name="check">${renderDSD('neu-icon', { name: 'check' })}</neu-icon>`,
    );
    const el = doc.body.firstElementChild as NeuIcon;
    const server = el.shadowRoot!.querySelector('svg');
    const writes = watch(el);
    document.body.append(document.adoptNode(el));
    expect(el).toBeInstanceOf(NeuIcon);
    mount('<div></div>').append(el);
    el.label = 'Done';
    await settle();
    expect(svgOf(el)).toBe(server);
    expect(writes()).toEqual([]);
  });

  test('only the latest name wins when responses arrive out of order', async () => {
    stubFetch(
      (url) =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve(new Response(`<svg viewBox="0 0 24 24"><path id="${url}"/></svg>`)),
            url.endsWith('slow.svg') ? 80 : 5,
          ),
        ),
    );
    registerIconLibrary('t-order', { resolve: (name) => `/${name}.svg` });
    const el = mount<NeuIcon>('<neu-icon library="t-order" name="slow"></neu-icon>');
    el.name = 'fast';
    await vi.waitFor(() => expect(svgOf(el)?.querySelector('path')?.id).toBe('/fast.svg'));
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(svgOf(el)!.querySelector('path')!.id).toBe('/fast.svg');
  });

  test('a library that throws or fails to load leaves the icon empty without throwing', async () => {
    registerIconLibrary('t-throws', {
      resolve: () => {
        throw new Error('boom');
      },
    });
    registerIconLibrary('t-404', { resolve: () => '/missing.svg' });
    registerIconLibrary('t-net', { resolve: () => '/net.svg' });
    registerIconLibrary('t-junk', { resolve: () => '<svg><unclosed></svg>' });
    stubFetch(async (url) => {
      if (url.includes('net')) throw new TypeError('network');
      return new Response('nope', { status: 404 });
    });
    const els = ['t-throws', 't-404', 't-net', 't-junk', 't-unregistered'].map((library) =>
      mount<NeuIcon>(`<neu-icon library="${library}" name="a"></neu-icon>`),
    );
    await settle();
    for (const el of els) expect(box(el).childNodes.length).toBe(0);
  });

  test.each(Object.entries(PAYLOADS))(
    'hostile markup (%s) never yields active content',
    async (_name, markup) => {
      registerIconLibrary('t-evil', { resolve: () => markup });
      const el = mount<NeuIcon>('<neu-icon library="t-evil" name="a"></neu-icon>');
      await tick();
      await tick();
      const root = box(el);
      expect(
        root.querySelector('img, iframe, set, animate, style, image, script, foreignObject, p, a'),
      ).toBeNull();
      for (const use of root.querySelectorAll('use')) {
        expect(use.getAttribute('href') ?? '#').toMatch(/^#/);
      }
      for (const node of root.querySelectorAll('*')) {
        expect(node.namespaceURI).toBe('http://www.w3.org/2000/svg');
      }
      expect((window as unknown as Record<string, unknown>)[HIT]).toBeUndefined();
    },
  );

  test('markup without xmlns still renders', async () => {
    registerIconLibrary('t-nons', {
      resolve: () => '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>',
    });
    const el = mount<NeuIcon>('<neu-icon library="t-nons" name="a"></neu-icon>');
    await vi.waitFor(() => expect(svgOf(el)?.querySelector('path')).not.toBeNull());
  });

  test('a null resolve result or an empty name does not fetch and leaves the icon empty', async () => {
    const fetchMock = stubFetch('<svg/>');
    registerIconLibrary('t-null', { resolve: () => null as unknown as string });
    registerIconLibrary('t-empty', { resolve: () => '/x.svg' });
    const a = mount<NeuIcon>('<neu-icon library="t-null" name="a"></neu-icon>');
    const b = mount<NeuIcon>('<neu-icon library="t-empty"></neu-icon>');
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(box(a).childNodes.length + box(b).childNodes.length).toBe(0);
  });

  test('a blank resolve result does not fetch the current page', async () => {
    const fetchMock = stubFetch('<svg/>');
    registerIconLibrary('t-blank', { resolve: (name) => (name === 'ws' ? '  \n ' : '') });
    const els = ['ws', 'empty'].map((name) =>
      mount<NeuIcon>(`<neu-icon library="t-blank" name="${name}"></neu-icon>`),
    );
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(els.map((el) => box(el).childNodes.length)).toEqual([0, 0]);
  });

  test('fetched text with leading whitespace before the XML declaration still parses', async () => {
    stubFetch(
      '\n  <?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><path d="M5 5"/></svg>\n',
    );
    registerIconLibrary('t-xml', { resolve: () => '/icons/xml.svg' });
    const el = mount<NeuIcon>('<neu-icon library="t-xml" name="a"></neu-icon>');
    await vi.waitFor(() =>
      expect(svgOf(el)?.querySelector('path')?.getAttribute('d')).toBe('M5 5'),
    );
  });

  test('an SVG that covers the viewport cannot reach outside the icon', () => {
    registerIconLibrary('t-fixed', {
      resolve: () =>
        '<svg viewBox="0 0 24 24" style="position:fixed;inset:0;opacity:0"><path d="M1 1"/></svg>',
    });
    const el = mount<NeuIcon>('<neu-icon library="t-fixed" name="a"></neu-icon>');
    const target = document.elementFromPoint(window.innerWidth - 20, window.innerHeight - 20);
    expect(target).not.toBe(el);
    expect(getComputedStyle(box(el)).contain).toContain('paint');
  });
});
