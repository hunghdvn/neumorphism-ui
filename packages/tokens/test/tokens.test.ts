import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import css from '../src/neu.css?inline';

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-neu-theme');
  document.querySelectorAll('style[data-test-user]').forEach((style) => style.remove());
});

function prop(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function mount(markup: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host;
}

describe('themes (§5.5)', () => {
  test('light values apply when the theme is forced to light', () => {
    document.documentElement.setAttribute('data-neu-theme', 'light');
    expect(prop(document.documentElement, '--neu-bg')).toBe('#e0e5ec');
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light');
  });

  test('data-neu-theme="dark" switches the defaults on any subtree', () => {
    document.documentElement.setAttribute('data-neu-theme', 'light');
    const section = mount('<section data-neu-theme="dark">x</section>').querySelector('section')!;
    expect(prop(section, '--neu-bg')).toBe('#2b2f36');
    expect(getComputedStyle(section).colorScheme).toBe('dark');
    expect(getComputedStyle(section).backgroundColor).toBe('rgb(43, 47, 54)');
  });
});

describe('dark media block', () => {
  test('the dark media block sets the dark defaults', () => {
    const rules: CSSStyleRule[] = [];
    const walk = (list: CSSRuleList, inDark: boolean): void => {
      for (const rule of Array.from(list)) {
        if (rule instanceof CSSMediaRule) {
          walk(rule.cssRules, inDark || rule.conditionText.includes('prefers-color-scheme: dark'));
        } else if (rule instanceof CSSStyleRule) {
          if (inDark) rules.push(rule);
          walk(rule.cssRules, inDark);
        } else if ('cssRules' in rule) {
          walk((rule as CSSGroupingRule).cssRules, inDark);
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules, false);
    const root = rules.find((rule) =>
      /^:root:not\(\[data-neu-theme=.light.\]\)$/.test(rule.selectorText),
    );
    expect(root, 'dark :root rule').toBeDefined();
    const get = (name: string) => root!.style.getPropertyValue(name).trim();
    expect(get('--neu-bg')).toBe('#2b2f36');
    expect(get('--_neu-shade')).toBe('45%');
    expect(get('--_neu-light')).toBe('6%');
    expect(get('--_neu-fg-mix')).toBe('42%');
    expect(get('--_neu-fg-muted-mix')).toBe('24%');
  });
});

describe('derived values (§5.2, §5.3)', () => {
  test('shadows are recomputed inside .neu-surface with a different background', () => {
    document.documentElement.setAttribute('data-neu-theme', 'light');
    const host = mount(
      '<div class="neu-raised" id="a">a</div>' +
        '<div class="neu-surface" style="--neu-bg: #f5d0d8"><div class="neu-raised" id="b">b</div></div>',
    );
    const a = getComputedStyle(host.querySelector('#a')!).boxShadow;
    const b = getComputedStyle(host.querySelector('#b')!).boxShadow;
    expect(a).not.toBe('none');
    expect(b).not.toBe('none');
    expect(b).not.toBe(a);
  });

  test('token utility classes inside a neu-surface re-derive', () => {
    document.documentElement.setAttribute('data-neu-theme', 'light');
    const host = mount(
      '<div class="neu-raised" id="a">a</div>' +
        '<neu-surface style="--neu-bg: #f5d0d8"><div class="neu-raised" id="b">b</div></neu-surface>',
    );
    const a = getComputedStyle(host.querySelector('#a')!).boxShadow;
    const b = getComputedStyle(host.querySelector('#b')!).boxShadow;
    expect(b).not.toBe('none');
    expect(b).not.toBe(a);
  });

  test('--neu-intensity scales the dark shadow and is clamped at 100%', () => {
    const host = mount(
      '<div class="neu-surface" style="--neu-intensity: 50"><i style="display:block;background-color: var(--_neu-sd)"></i></div>',
    );
    expect(getComputedStyle(host.querySelector('i')!).backgroundColor).toBe('oklab(0 0 0)');
  });

  test('optional overrides win over derived values', () => {
    const host = mount(
      '<div class="neu-surface" style="--neu-shadow-dark: rgb(255, 0, 0)"><i style="display:block;background-color: var(--_neu-sd)"></i></div>',
    );
    expect(getComputedStyle(host.querySelector('i')!).backgroundColor).toBe('rgb(255, 0, 0)');
  });
});

describe('cascade layer (§5.5)', () => {
  test('unlayered author CSS beats tokens regardless of selector specificity', () => {
    document.documentElement.setAttribute('data-neu-theme', 'dark');
    const user = document.createElement('style');
    user.dataset.testUser = '';
    user.textContent = ':root { --neu-accent: rgb(1, 2, 3); }';
    document.head.append(user);
    expect(prop(document.documentElement, '--neu-accent')).toBe('rgb(1, 2, 3)');
  });
});

describe('undefined elements (§5.6)', () => {
  test('known tags are hidden but keep their box until defined', () => {
    const el = mount('<neu-text-field label="Email"></neu-text-field>').querySelector(
      'neu-text-field',
    )!;
    const style = getComputedStyle(el);
    expect(style.visibility).toBe('hidden');
    expect(style.display).toBe('block');
    expect(el.getBoundingClientRect().height).toBeGreaterThan(40);
  });

  test('an element that already has a shadow root can undo the hiding with :host', () => {
    const el = mount('<neu-switch></neu-switch>').querySelector('neu-switch')!;
    el.attachShadow({ mode: 'open' }).innerHTML =
      '<style>:host(:not(:defined)) { visibility: inherit !important; }</style><span>x</span>';
    expect(getComputedStyle(el).visibility).toBe('visible');
  });
});
