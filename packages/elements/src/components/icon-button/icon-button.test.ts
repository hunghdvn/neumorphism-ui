import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../button.js';
import '../../text-field.js';
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
    let submits = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submits++;
    });
    await userEvent.click(form.querySelector('neu-icon-button')!);
    await tick();
    expect(submits).toBe(1);
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

  test('hydration and later moves keep the server-rendered icon', async () => {
    const attrs = { icon: 'x', label: 'Close' };
    const doc = document.implementation.createHTMLDocument('');
    doc.body.setHTMLUnsafe(
      `<neu-icon-button icon="x" label="Close">${renderDSD('neu-icon-button', attrs)}</neu-icon-button>`,
    );
    const el = doc.body.firstElementChild as NeuIconButton;
    const icon = el.shadowRoot!.querySelector('.icon')!;
    const server = icon.querySelector('svg');
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(icon, { subtree: true, childList: true, attributes: true });
    document.body.append(document.adoptNode(el));
    expect(el).toBeInstanceOf(NeuIconButton);
    mount('<div></div>').append(el);
    await tick();
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(icon.querySelector('svg')).toBe(server);
    expect(records).toEqual([]);
    // A real change still redraws.
    el.icon = 'check';
    expect(icon.querySelector('svg')).not.toBe(server);
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

  test('a library SVG that covers the viewport does not hijack clicks elsewhere', async () => {
    registerIconLibrary('t-ib-fixed', {
      resolve: () =>
        '<svg viewBox="0 0 24 24" style="position:fixed;inset:0;opacity:0"><path d="M1 1"/></svg>',
    });
    const el = mount<NeuIconButton>(
      '<neu-icon-button icon="a" library="t-ib-fixed"></neu-icon-button>',
    );
    await tick();
    const rect = el.getBoundingClientRect();
    const far = document.elementFromPoint(rect.left + 300, rect.top + 300);
    expect(far).not.toBe(el);
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    far?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(clicks).toBe(0);
  });

  test('a stray loading attribute does not change the cursor', () => {
    const el = mount<NeuIconButton>('<neu-icon-button icon="x"></neu-icon-button>');
    expect(getComputedStyle(el).cursor).toBe('pointer');
    el.setAttribute('loading', '');
    expect(getComputedStyle(el).cursor).toBe('pointer');
    el.setAttribute('disabled', '');
    expect(getComputedStyle(el).cursor).toBe('not-allowed');
  });

  describe('implicit submission', () => {
    async function enterIn(form: HTMLFormElement): Promise<number> {
      let submitted = 0;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitted++;
      });
      form.querySelector<HTMLElement>('neu-text-field, input')!.focus();
      await userEvent.keyboard('{Enter}');
      await tick();
      return submitted;
    }

    test('Enter in a two-field form submits through the icon button and fires its click', async () => {
      const form = mountForm(
        '<neu-text-field name="a" label="A"></neu-text-field><neu-text-field name="b" label="B"></neu-text-field>' +
          '<neu-icon-button icon="check" type="submit"></neu-icon-button>',
      );
      const clicks = countClicks(form.querySelector('neu-icon-button')!);
      expect(await enterIn(form)).toBe(1);
      expect(clicks()).toBe(1);
    });

    test('an icon button before a neu-button is the default button', async () => {
      const form = mountForm(
        '<neu-text-field name="a" label="A"></neu-text-field>' +
          '<neu-icon-button icon="check" type="submit"></neu-icon-button><neu-button type="submit">Go</neu-button>',
      );
      const icon = countClicks(form.querySelector('neu-icon-button')!);
      const button = countClicks(form.querySelector('neu-button')!);
      expect(await enterIn(form)).toBe(1);
      expect([icon(), button()]).toEqual([1, 0]);
    });
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
