import { afterEach, describe, expect, test } from 'vitest';
import { NeuAvatar } from '../../avatar.js';
import { renderDSD } from '../../ssr.js';
import { axeViolations, internalsOf, mount } from '../../test-utils/helpers.js';
import { avatarDef } from './avatar.def.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const BROKEN = 'data:image/png;base64,AAAA';

/** An SVG with only a viewBox: no intrinsic width, yet a valid picture. */
const SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>')}`;

const show = (el: Element) => el.shadowRoot!.querySelector('.base')!.getAttribute('data-show');
const initials = (el: Element) => el.shadowRoot!.querySelector('.initials')!.textContent;
const image = (el: Element) => el.shadowRoot!.querySelector('img')!;
const avatar = (attrs = '') => mount<NeuAvatar>(`<neu-avatar${attrs}></neu-avatar>`);
const failed = (el: Element) =>
  new Promise((resolve) => image(el).addEventListener('error', resolve, { once: true }));
const hasErrorState = (el: Element) => internalsOf(el).states.has('image-error');

describe('neu-avatar', () => {
  test('defaults, reflection and invalid values', () => {
    const el = avatar();
    expect(el).toBeInstanceOf(NeuAvatar);
    expect([el.src, el.label, el.initials, el.size, el.shape]).toEqual([
      '',
      '',
      '',
      'md',
      'circle',
    ]);
    el.size = 'lg';
    el.shape = 'rounded';
    el.src = PNG;
    expect(el.getAttribute('size')).toBe('lg');
    expect(el.getAttribute('shape')).toBe('rounded');
    expect(el.getAttribute('src')).toBe(PNG);
    const bad = avatar(' size="huge" shape="star"');
    expect([bad.size, bad.shape]).toEqual(['md', 'circle']);
  });

  test('role img named by label, with the documented parts; axe finds nothing', async () => {
    const el = avatar(' label="Hung Do" initials="HD"');
    expect(internalsOf(el).role).toBe('img');
    expect(internalsOf(el).ariaLabel).toBe('Hung Do');
    el.label = 'Someone';
    expect(internalsOf(el).ariaLabel).toBe('Someone');
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')].map((p) => p.getAttribute('part'));
    expect(parts).toEqual(['base', 'image', 'initials', 'icon', 'svg']);
    expect(await axeViolations(el)).toEqual([]);
  });

  test('without a label it is decorative, not an unnamed image', async () => {
    const el = avatar(' initials="HD"');
    expect(internalsOf(el).role).toBeNull();
    expect(internalsOf(el).ariaHidden).toBe('true');
    el.label = 'Hung Do';
    expect(internalsOf(el).role).toBe('img');
    expect(internalsOf(el).ariaHidden).toBeNull();
    el.label = '';
    expect(internalsOf(el).role).toBeNull();
    expect(internalsOf(el).ariaLabel).toBeNull();
    expect(internalsOf(el).ariaHidden).toBe('true');
    expect(await axeViolations(el)).toEqual([]);
  });

  test('a server root that never got its image is rendered afresh once the page has loaded', () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => errors.push(event.error);
    window.addEventListener('error', onError);
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    let el: NeuAvatar;
    try {
      el = document.createElement('neu-avatar') as NeuAvatar;
      document.body.append(el);
      // A declarative root that never got its <img data-ref="image">.
      const root = el.attachShadow({ mode: 'open' });
      root.innerHTML = '<span data-ref="base"></span>';
      document.dispatchEvent(new Event('DOMContentLoaded'));
    } finally {
      delete (document as { readyState?: unknown }).readyState;
      window.removeEventListener('error', onError);
    }
    expect(errors).toEqual([]);
    expect(el.shadowRoot!.adoptedStyleSheets).toHaveLength(1);
    // Unfinished once the page has loaded, so it was rendered afresh and works.
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull();
    el.initials = 'HD';
    expect(show(el)).toBe('initials');
    expect(initials(el)).toBe('HD');
  });

  test('falls back image → initials → icon', async () => {
    const el = avatar(` src="${PNG}" initials="HD"`);
    expect(show(el)).toBe('image');
    expect(getComputedStyle(image(el)).display).toBe('block');
    expect(getComputedStyle(el.shadowRoot!.querySelector('.initials')!).display).toBe('none');

    el.src = BROKEN;
    await failed(el);
    expect(hasErrorState(el)).toBe(true);
    expect(show(el)).toBe('initials');
    expect(getComputedStyle(image(el)).display).toBe('none');
    expect(el.shadowRoot!.querySelector('.initials')!.textContent).toBe('HD');

    el.initials = '';
    expect(show(el)).toBe('icon');
    expect(getComputedStyle(el.shadowRoot!.querySelector('.icon')!).display).toBe('flex');

    el.src = '';
    el.initials = 'AB';
    expect(show(el)).toBe('initials');
    expect(initials(el)).toBe('AB');
    el.initials = '';
    expect(show(el)).toBe('icon');
  });

  test('initials set after the first render show their text', () => {
    const el = avatar();
    el.initials = 'HD';
    expect(show(el)).toBe('initials');
    expect(initials(el)).toBe('HD');
    el.setAttribute('initials', 'AB');
    expect(initials(el)).toBe('AB');
  });

  test('an image that failed before upgrade still falls back', async () => {
    const tag = 'neu-avatar-early';
    class Early extends NeuAvatar {
      static override def = { ...avatarDef, tag };
    }
    const server = (attrs: Record<string, string>) => {
      const text = Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('');
      return `<${tag}${text}>${renderDSD('neu-avatar', attrs).replaceAll('neu-avatar', tag)}</${tag}>`;
    };
    document.body.setHTMLUnsafe(
      server({ src: BROKEN, initials: 'HD' }) +
        server({ src: BROKEN }) +
        server({ src: SVG, initials: 'HD' }),
    );
    const [withInitials, bare, svg] = [...document.body.children] as NeuAvatar[];
    expect(withInitials!.shadowRoot).not.toBeNull();
    // The server markup claims the picture; the error event fires before the element is defined.
    expect(show(withInitials!)).toBe('image');
    await Promise.all([failed(withInitials!), failed(bare!), image(svg!).decode()]);

    Early.define();
    expect(withInitials).toBeInstanceOf(Early);
    expect(show(withInitials!)).toBe('initials');
    expect(show(bare!)).toBe('icon');
    expect(hasErrorState(withInitials!)).toBe(true);
    // Loaded before upgrade too, and not mistaken for a broken one.
    expect(show(svg!)).toBe('image');
    expect(hasErrorState(svg!)).toBe(false);
  });

  test('changing src clears the error', async () => {
    const el = avatar(` src="${BROKEN}" initials="HD"`);
    await failed(el);
    expect(hasErrorState(el)).toBe(true);
    expect(show(el)).toBe('initials');
    el.src = PNG;
    expect(hasErrorState(el)).toBe(false);
    expect(show(el)).toBe('image');
    expect(image(el).getAttribute('src')).toBe(PNG);
    el.removeAttribute('src');
    expect(image(el).hasAttribute('src')).toBe(false);
    expect(show(el)).toBe('initials');
  });

  test('src is escaped, and an empty src renders no src attribute', () => {
    const el = avatar(' initials="A"');
    expect(image(el).hasAttribute('src')).toBe(false);
    const tricky = avatar(` src='x" onerror="alert(1)'`);
    expect(image(tricky).getAttribute('src')).toBe('x" onerror="alert(1)');
    expect(image(tricky).hasAttribute('onerror')).toBe(false);
  });

  test('sizes are 2rem, 2.5rem and 3.5rem, with 0.4x text and a 60% icon', () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const el = avatar(' initials="HD"');
    const width = () => el.getBoundingClientRect().width;
    expect(width()).toBe(2.5 * rem);
    el.size = 'sm';
    expect(width()).toBe(2 * rem);
    expect(
      parseFloat(getComputedStyle(el.shadowRoot!.querySelector('.base')!).fontSize),
    ).toBeCloseTo(0.8 * rem);
    el.size = 'lg';
    expect(width()).toBe(3.5 * rem);
    el.initials = '';
    const icon = el.shadowRoot!.querySelector('.icon')!.getBoundingClientRect();
    expect(icon.width).toBeCloseTo(0.6 * 3.5 * rem, 1);
  });

  test('circle is round, rounded uses the theme radius, and the base is raised', () => {
    const el = avatar();
    const base = () => getComputedStyle(el.shadowRoot!.querySelector('.base')!);
    expect(base().borderTopLeftRadius).toBe('50%');
    expect(base().boxShadow).not.toBe('none');
    el.shape = 'rounded';
    expect(base().borderTopLeftRadius).not.toBe('50%');
    expect(parseFloat(base().borderTopLeftRadius)).toBeGreaterThan(0);
  });

  test('hydration writes nothing when nothing failed', async () => {
    const attrs = { src: PNG, initials: 'HD' };
    const text = Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join('');
    const doc = document.implementation.createHTMLDocument('');
    doc.body.setHTMLUnsafe(`<neu-avatar${text}>${renderDSD('neu-avatar', attrs)}</neu-avatar>`);
    const el = doc.body.firstElementChild as NeuAvatar;
    const writes: MutationRecord[] = [];
    const observer = new MutationObserver((records) => writes.push(...records));
    observer.observe(el.shadowRoot!, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
    });
    document.body.append(document.adoptNode(el));
    await new Promise((resolve) => setTimeout(resolve, 50));
    observer.disconnect();
    expect(el).toBeInstanceOf(NeuAvatar);
    // adoptRoot removes the SSR style element; that is the only allowed change.
    expect(
      writes.filter(
        (r) =>
          !(r.type === 'childList' && r.removedNodes.length === 1 && r.addedNodes.length === 0),
      ),
    ).toEqual([]);
    expect(show(el)).toBe('image');
    expect(hasErrorState(el)).toBe(false);
  });
});

test('a load after a stale error shows the image', () => {
  const el = avatar(` src="${PNG}" initials="AB"`);
  image(el).dispatchEvent(new Event('error'));
  expect(show(el)).toBe('initials');
  image(el).dispatchEvent(new Event('load'));
  expect(show(el)).toBe('image');
  expect(hasErrorState(el)).toBe(false);
});

test('whitespace-only initials fall back to the icon', () => {
  const el = avatar(' initials="  "');
  expect(show(el)).toBe('icon');
});
