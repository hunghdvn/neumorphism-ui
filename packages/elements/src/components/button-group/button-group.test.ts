import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuButton } from '../../button.js';
import { NeuButtonGroup } from '../../button-group.js';
import { NeuIconButton } from '../../icon-button.js';
import { renderDSD } from '../../ssr.js';
import { axeViolations, internalsOf, mount } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const base = (el: Element) => el.shadowRoot!.querySelector('.base') as HTMLElement;
const style = (el: Element) => getComputedStyle(base(el));
const TRANSPARENT = '0px 0px 0px 0px';

/** Radii in start-start, start-end, end-start, end-end order. */
const corners = (el: Element) => {
  const s = style(el);
  return [
    s.borderStartStartRadius,
    s.borderStartEndRadius,
    s.borderEndStartRadius,
    s.borderEndEndRadius,
  ];
};

const three = (attrs = '') =>
  mount<NeuButtonGroup>(
    `<neu-button-group label="Align"${attrs}><neu-button>A</neu-button><neu-button>B</neu-button><neu-button>C</neu-button></neu-button-group>`,
  );

describe('neu-button-group', () => {
  test('defaults, reflection and invalid values', () => {
    const el = three();
    expect(el).toBeInstanceOf(NeuButtonGroup);
    expect([el.label, el.orientation]).toEqual(['Align', 'horizontal']);
    el.orientation = 'vertical';
    expect(el.getAttribute('orientation')).toBe('vertical');
    const bad = mount<NeuButtonGroup>(
      '<neu-button-group orientation="diagonal"></neu-button-group>',
    );
    expect([bad.label, bad.orientation]).toEqual(['', 'horizontal']);
  });

  test('exposes the documented parts', () => {
    const parts = [...three().shadowRoot!.querySelectorAll('[part]')].map((p) =>
      p.getAttribute('part'),
    );
    expect(parts).toEqual(['base']);
  });

  test('is a labelled group', async () => {
    const el = three();
    expect(internalsOf(el).role).toBe('group');
    expect(internalsOf(el).ariaLabel).toBe('Align');
    el.label = 'Other';
    expect(internalsOf(el).ariaLabel).toBe('Other');
    expect(await axeViolations(el)).toEqual([]);
  });

  test('is not hidden before it is defined and lays out as inline-flex', () => {
    const el = three();
    expect(getComputedStyle(el).display).toBe('inline-flex');
  });

  test('children lose their own shadow and get outer corners only', () => {
    const [a, b, c] = three().children;
    for (const item of [a, b, c]) expect(style(item!).boxShadow).toContain(TRANSPARENT);
    expect(style(b!).boxShadow).not.toMatch(/\d{2,}px/);
    const radius = style(a!).getPropertyValue('border-start-start-radius');
    expect(radius).not.toBe('0px');
    // start corners round on the first button, end corners on the last, none in the middle
    expect(corners(a!)).toEqual([radius, '0px', radius, '0px']);
    expect(corners(b!)).toEqual(['0px', '0px', '0px', '0px']);
    expect(corners(c!)).toEqual(['0px', radius, '0px', radius]);
  });

  test('vertical: the first button rounds its top corners and the last its bottom ones', () => {
    const [a, b, c] = three(' orientation="vertical"').children;
    const radius = style(a!).borderStartStartRadius;
    expect(radius).not.toBe('0px');
    expect(corners(a!)).toEqual([radius, radius, '0px', '0px']);
    expect(corners(b!)).toEqual(['0px', '0px', '0px', '0px']);
    expect(corners(c!)).toEqual(['0px', '0px', radius, radius]);
    expect(
      getComputedStyle(three(' orientation="vertical"').shadowRoot!.querySelector('.base')!)
        .flexDirection,
    ).toBe('column');
  });

  test('the group itself carries the raised shadow and the radius', () => {
    const s = style(three());
    expect(s.boxShadow).not.toContain(TRANSPARENT);
    expect(s.borderStartStartRadius).not.toBe('0px');
  });

  test('small buttons and icon buttons merge too', () => {
    const el = mount<NeuButtonGroup>(
      '<neu-button-group label="x"><neu-button size="sm">A</neu-button><neu-icon-button icon="x" label="X"></neu-icon-button></neu-button-group>',
    );
    expect(NeuIconButton).toBeDefined();
    const [a, b] = el.children;
    expect(style(a!).boxShadow).toContain(TRANSPARENT);
    expect(style(b!).boxShadow).toContain(TRANSPARENT);
    expect(corners(b!)[1]).not.toBe('0px');
    expect(corners(b!)[0]).toBe('0px');
  });

  test('buttons of different widths and sizes fill the group', () => {
    const rect = (el: Element) => base(el).getBoundingClientRect();
    const vertical = mount<NeuButtonGroup>(
      '<neu-button-group label="x" orientation="vertical"><neu-button>Save</neu-button><neu-button>Delete permanently</neu-button></neu-button-group>',
    );
    const [save, remove] = vertical.children;
    expect(rect(save!).width).toBeGreaterThan(0);
    expect(rect(save!).width).toBeCloseTo(rect(remove!).width, 1);
    const row = mount<NeuButtonGroup>(
      '<neu-button-group label="x"><neu-button size="sm">A</neu-button><neu-button size="lg">B</neu-button></neu-button-group>',
    );
    const [small, large] = row.children;
    expect(rect(small!).height).toBeCloseTo(rect(large!).height, 1);
    expect(rect(small!).height).toBeCloseTo(row.getBoundingClientRect().height, 1);
    // Outside a group a button keeps its own size.
    const alone = mount<NeuButton>('<neu-button size="sm">A</neu-button>');
    expect(rect(alone).height).toBeLessThan(rect(large!).height);
  });

  test('children that are not rendered do not take the outer corners', () => {
    const el = mount<NeuButtonGroup>(
      '<neu-button-group label="x"><script type="text/plain">x</script><template></template><neu-button hidden>Undo</neu-button><neu-button>Save</neu-button><neu-button>Cancel</neu-button><neu-button hidden>Redo</neu-button><style></style></neu-button-group>',
    );
    const [, , , save, cancel] = el.children;
    const radius = style(save!).borderStartStartRadius;
    expect(radius).not.toBe('0px');
    expect(corners(save!)).toEqual([radius, '0px', radius, '0px']);
    expect(corners(cancel!)).toEqual(['0px', radius, '0px', radius]);
  });

  test('the group does not reveal children that are not rendered', () => {
    const el = mount<NeuButtonGroup>(
      '<neu-button-group label="x"><template></template><script type="text/plain">x</script><span hidden>gone</span><neu-button hidden>Undo</neu-button><neu-button>Save</neu-button></neu-button-group>',
    );
    const [template, script, span, undo, save] = [...el.children];
    for (const child of [template, script, span, undo]) {
      expect(getComputedStyle(child!).display).toBe('none');
    }
    expect(getComputedStyle(save!).display).toBe('flex');
    // Outside a group a button keeps its inline-block host.
    expect(getComputedStyle(mount('<neu-button>A</neu-button>')).display).toBe('inline-block');
  });

  test('a flat button inside a group draws no shadow of its own on hover', async () => {
    const el = mount<NeuButtonGroup>(
      '<neu-button-group label="x"><neu-button variant="flat">A</neu-button><neu-button>B</neu-button></neu-button-group>',
    );
    const flat = el.children[0]!;
    await userEvent.hover(flat);
    expect(flat.matches(':hover')).toBe(true);
    expect(style(flat).boxShadow).toContain(TRANSPARENT);
    expect(style(flat).boxShadow).not.toMatch(/\d{2,}px/);
  });

  test('a keyboard-focused button inside a group shows the focus ring', async () => {
    const el = three();
    el.style.setProperty('--neu-duration', '0ms');
    const probe = document.createElement('div');
    probe.style.background = 'color-mix(in oklab, var(--neu-accent, #6d5dfc) 45%, transparent)';
    el.append(probe);
    const accent = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const middle = el.children[1] as NeuButton;
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(middle);
    const shadow = style(middle).boxShadow;
    expect(shadow).toContain(accent);
    expect(shadow).toContain('3px');
  });

  test('the focused button is stacked above its neighbours so the ring is not painted over', async () => {
    const el = three();
    const [a, b, c] = [...el.children] as NeuButton[];
    const stacking = (item: Element) => {
      const s = getComputedStyle(item);
      return [s.position, s.zIndex];
    };
    expect(stacking(b!)).toEqual(['static', 'auto']);
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(b);
    expect(stacking(b!)).toEqual(['relative', '1']);
    expect(stacking(a!)).toEqual(['static', 'auto']);
    expect(stacking(c!)).toEqual(['static', 'auto']);
  });

  test('buttons outside a group keep their own shadow and corners', () => {
    const el = mount<NeuButton>('<neu-button>Solo</neu-button>');
    const s = style(el);
    expect(s.boxShadow).not.toContain(TRANSPARENT);
    expect(s.boxShadow).not.toBe('none');
    const [first, ...rest] = corners(el);
    expect(first).not.toBe('0px');
    expect(rest).toEqual([first, first, first]);
  });

  test('SSR output is already merged', () => {
    const out = renderDSD('neu-button-group', { label: 'Align' });
    expect(out).toContain('::slotted(');
    expect(out).toContain('--_neu-grp-shadow');
    expect(out).toContain('<slot></slot>');
  });
});
