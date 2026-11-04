import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuIconButton } from '../../icon-button.js';
import { registerIconLibrary } from '../../icons.js';
import { renderDSD } from '../../ssr.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  keyup,
  mount,
  mountForm,
  tick,
} from '../../test-utils/helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function countClicks(el: Element): () => number {
  let clicks = 0;
  el.addEventListener('click', () => clicks++);
  return () => clicks;
}

const base = (el: Element) => el.shadowRoot!.querySelector('.base') as HTMLElement;

describe('neu-icon-button', () => {
  test('defaults, reflection and invalid values', () => {
    const el = mount<NeuIconButton>('<neu-icon-button icon="x"></neu-icon-button>');
    expect(el).toBeInstanceOf(NeuIconButton);
    expect(el.getAttribute('tabindex')).toBe('0');
    expect([el.shape, el.variant, el.size, el.type, el.library, el.disabled]).toEqual([
      'circle',
      'default',
      'md',
      'button',
      'system',
      false,
    ]);
    el.shape = 'square';
    expect(el.getAttribute('shape')).toBe('square');
    const bad = mount<NeuIconButton>(
      '<neu-icon-button icon="x" shape="blob" variant="nope" size="xl" type="nope"></neu-icon-button>',
    );
    expect([bad.shape, bad.variant, bad.size, bad.type]).toEqual([
      'circle',
      'default',
      'md',
      'button',
    ]);
  });

  test('exposes the documented parts', () => {
    const el = mount('<neu-icon-button icon="x"></neu-icon-button>');
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')].map((p) => p.getAttribute('part'));
    expect(parts).toEqual(['base', 'icon', 'svg']);
  });

  test('is a button named by label', async () => {
    const el = mount('<neu-icon-button icon="x" label="Close"></neu-icon-button>');
    expect(internalsOf(el).role).toBe('button');
    expect(internalsOf(el).ariaLabel).toBe('Close');
    expect(await axeViolations(el)).toEqual([]);
  });

  test('without a label the icon name is the accessible name', async () => {
    const el = mount<NeuIconButton>('<neu-icon-button icon="x"></neu-icon-button>');
    expect(internalsOf(el).ariaLabel).toBe('x');
    expect(await axeViolations(el)).toEqual([]);
    el.label = 'Close';
    await tick();
    expect(internalsOf(el).ariaLabel).toBe('Close');
    el.label = '';
    await tick();
    expect(internalsOf(el).ariaLabel).toBe('x');
  });

  test('inherits activation', async () => {
    const el = mount<NeuIconButton>('<neu-icon-button icon="x"></neu-icon-button>');
    const clicks = countClicks(el);
    keydown(el, 'Enter');
    await tick();
    expect(clicks()).toBe(1);
    keydown(el, ' ');
    await tick();
    keyup(el, ' ');
    await tick();
    expect(clicks()).toBe(2);
  });

  test('type=submit submits its form', async () => {
    const form = mountForm('<neu-icon-button icon="check" type="submit"></neu-icon-button>');
    let submitter: unknown;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitter = (event as SubmitEvent).submitter;
    });
    await userEvent.click(form.querySelector('neu-icon-button')!);
    await tick();
    expect(submitter).toBe(form.querySelector('neu-icon-button'));
  });

  test('a disabled icon button emits no click', async () => {
    const el = mount<NeuIconButton>('<neu-icon-button icon="x" disabled></neu-icon-button>');
    const clicks = countClicks(el);
    el.click();
    keydown(el, 'Enter');
    await tick();
    expect(clicks()).toBe(0);
  });

  test('renders the system icon in the template and in SSR output', () => {
    const el = mount('<neu-icon-button icon="x" label="Close"></neu-icon-button>');
    expect(el.shadowRoot!.querySelector('.icon svg path')).not.toBeNull();
    expect(renderDSD('neu-icon-button', { icon: 'x', label: 'Close' })).toContain('<path');
  });

  test('custom library icons fill in on the client', async () => {
    const svg = (d: string) => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
    const fetchMock = vi.fn(async (_url: string) => new Response(svg('M1 1')));
    vi.stubGlobal('fetch', fetchMock);
    registerIconLibrary('t-ib-url', { resolve: (name) => `/icons/${name}.svg` });
    const el = mount('<neu-icon-button icon="a" library="t-ib-url"></neu-icon-button>');
    const d = () => el.shadowRoot!.querySelector('.icon path')?.getAttribute('d');
    await vi.waitFor(() => expect(d()).toBe('M1 1'));
    expect(fetchMock.mock.calls[0]![0]).toBe('/icons/a.svg');
    registerIconLibrary('t-ib-url', { resolve: () => svg('M2 2') });
    await vi.waitFor(() => expect(d()).toBe('M2 2'));
  });

  test('a library registered after the button rendered fills it in', async () => {
    const el = mount('<neu-icon-button icon="a" library="t-ib-late"></neu-icon-button>');
    const d = () => el.shadowRoot!.querySelector('.icon path')?.getAttribute('d');
    expect(d()).toBeUndefined();
    registerIconLibrary('t-ib-late', {
      resolve: () => '<svg viewBox="0 0 24 24"><path d="M3 3"/></svg>',
    });
    await vi.waitFor(() => expect(d()).toBe('M3 3'));
  });

  test('shape and size change the box', () => {
    const el = mount<NeuIconButton>('<neu-icon-button icon="x"></neu-icon-button>');
    const width = () => base(el).getBoundingClientRect().width;
    expect(width()).toBe(40);
    el.size = 'sm';
    expect(width()).toBe(32);
    el.size = 'lg';
    expect(width()).toBe(48);
    el.size = 'md';
    const circle = getComputedStyle(base(el)).borderRadius;
    el.shape = 'square';
    expect(getComputedStyle(base(el)).borderRadius).not.toBe(circle);
  });
});
