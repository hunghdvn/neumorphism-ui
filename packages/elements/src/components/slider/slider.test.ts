import { afterEach, describe, expect, test } from 'vitest';
import { NeuSlider } from '../../slider.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  mount,
  mountForm,
  tick,
} from '../../test-utils/helpers.js';
import { sliderBigStep, sliderValue } from './slider.def.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const slider = (attrs = '', style = 'inline-size: 220px') =>
  mount<NeuSlider>(`<neu-slider style="${style}" ${attrs}></neu-slider>`);

/** Records the events a slider fires, as `type:value`. */
function record(el: NeuSlider): string[] {
  const log: string[] = [];
  for (const type of ['input', 'change']) {
    el.addEventListener(type, () => log.push(`${type}:${el.value}`));
  }
  return log;
}

function pointer(el: Element, type: string, clientX: number): PointerEvent {
  const event = new PointerEvent(type, {
    pointerId: 7,
    button: 0,
    isPrimary: true,
    clientX,
    clientY: 0,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

/** The x coordinate at `fraction` (0 to 1) of the track, from the left edge of the screen. */
function trackX(el: NeuSlider, fraction: number): number {
  const rect = el.shadowRoot!.querySelector('.track')!.getBoundingClientRect();
  return rect.left + rect.width * fraction;
}

describe('sliderValue', () => {
  const rows: [string, number, number, number, number, number][] = [
    ['in range, on a step', 50, 0, 100, 1, 50],
    ['NaN is the midpoint', Number.NaN, 0, 100, 1, 50],
    ['NaN midpoint snaps to a step', Number.NaN, 0, 99, 1, 50],
    ['below min', -5, 0, 100, 1, 0],
    ['above max', 500, 0, 100, 1, 100],
    ['snaps down', 33, 0, 100, 10, 30],
    ['snaps up on a half', 35, 0, 100, 10, 40],
    ['rounding past max steps back', 96, 0, 95, 10, 90],
    ['max below min collapses to min', 5, 10, 0, 1, 10],
    ['steps count from min', 7, 3, 20, 5, 8],
    ['the last step before max', 22, 3, 20, 5, 18],
    ['step 0 is 1', 4.4, 0, 10, 0, 4],
    ['negative step is 1', 4.6, 0, 10, -3, 5],
    ['Infinity is max', Number.POSITIVE_INFINITY, 0, 10, 1, 10],
    ['-Infinity is min', Number.NEGATIVE_INFINITY, 0, 10, 1, 0],
    ['fractional step has no float noise', 0.1 + 0.2, 0, 1, 0.1, 0.3],
    ['the max reached through a fractional step', 0.9, 0, 0.3, 0.1, 0.3],
    ['decimals of min count too', 1.02, 0.05, 2, 0.1, 1.05],
    ['negative range', -3.2, -10, -1, 0.5, -3],
  ];
  test('sliderValue clamps, snaps and handles max < min and fractional steps', () => {
    for (const [label, raw, min, max, step, expected] of rows) {
      expect(sliderValue(raw, min, max, step), label).toBe(expected);
    }
  });

  test('sliderBigStep is a tenth of the range in whole steps, at least one step', () => {
    expect(sliderBigStep(0, 100, 1)).toBe(10);
    expect(sliderBigStep(0, 100, 20)).toBe(20);
    expect(sliderBigStep(0, 1000, 1)).toBe(100);
    expect(sliderBigStep(0, 1, 0.1)).toBe(0.1);
    expect(sliderBigStep(5, 0, 1)).toBe(1);
    expect(sliderBigStep(0, 10, 0)).toBe(1);
  });
});

describe('neu-slider', () => {
  test('defaults: midpoint 50, range 0 to 100, step 1', () => {
    const el = slider();
    expect([el.value, el.min, el.max, el.step, el.name, el.label, el.disabled]).toEqual([
      50,
      0,
      100,
      1,
      '',
      '',
      false,
    ]);
    expect(el.defaultValue).toBe(50);
  });

  test('the value attribute is the default; the property is the current value', () => {
    const el = slider('value="30"');
    expect(el.value).toBe(30);
    el.value = 70;
    expect(el.value).toBe(70);
    expect(el.getAttribute('value')).toBe('30');
    expect(el.defaultValue).toBe(30);
    el.defaultValue = 40;
    expect(el.getAttribute('value')).toBe('40');
    expect(el.value).toBe(70);
  });

  test('before any assignment the value follows the attribute', () => {
    const el = slider('value="30"');
    el.setAttribute('value', '60');
    expect(el.value).toBe(60);
  });

  test('reflection: name, disabled, min, max, step and label reflect; value does not', () => {
    const el = slider();
    el.name = 'n';
    el.disabled = true;
    expect(['name', 'disabled'].map((a) => el.getAttribute(a))).toEqual(['n', '']);
    el.value = 20;
    el.min = 5;
    el.max = 90;
    el.step = 5;
    el.label = 'Volume';
    expect(el.hasAttribute('value')).toBe(false);
    expect(['min', 'max', 'step', 'label'].map((a) => el.getAttribute(a))).toEqual([
      '5',
      '90',
      '5',
      'Volume',
    ]);
  });

  test('invalid attributes fall back: value to the midpoint, min/max/step to their defaults', () => {
    const el = slider('value="abc" min="x" max="" step="nope"');
    expect([el.value, el.min, el.max, el.step]).toEqual([50, 0, 100, 1]);
  });

  test('the value is always in range and on a step', () => {
    const el = slider('min="10" max="20" step="4" value="99"');
    expect(el.value).toBe(18);
    el.value = -50;
    expect(el.value).toBe(10);
    el.value = 13;
    expect(el.value).toBe(14);
    el.value = Number.NaN;
    expect(el.value).toBe(14);
    el.max = 9;
    expect(el.value).toBe(10);
  });

  test('changing min, max or step re-snaps the value', () => {
    const el = slider('value="50"');
    el.step = 30;
    expect(el.value).toBe(60);
    el.max = 40;
    expect(el.value).toBe(30);
  });

  test('role slider with aria-valuemin, max, now, orientation and the label as name', () => {
    const el = slider('min="10" max="30" value="20" label="Volume"');
    const internals = internalsOf(el);
    expect(internals.role).toBe('slider');
    expect(internals.ariaOrientation).toBe('horizontal');
    expect(internals.ariaLabel).toBe('Volume');
    expect(internals.ariaValueMin).toBe('10');
    expect(internals.ariaValueMax).toBe('30');
    expect(internals.ariaValueNow).toBe('20');
    expect(internals.ariaValueText).toBeNull();
    el.value = 25;
    expect(internals.ariaValueNow).toBe('25');
    el.max = 24;
    expect(internals.ariaValueMax).toBe('24');
    expect(internals.ariaValueNow).toBe('24');
  });

  test('valueFormatter drives aria-valuetext and can change later', () => {
    const el = slider('value="20"');
    el.valueFormatter = (v) => `${v} percent`;
    expect(internalsOf(el).ariaValueText).toBe('20 percent');
    el.value = 30;
    expect(internalsOf(el).ariaValueText).toBe('30 percent');
    el.valueFormatter = undefined;
    expect(internalsOf(el).ariaValueText).toBeNull();
  });

  test('valueFormatter set before upgrade drives aria-valuetext', () => {
    const parsed = document.implementation.createHTMLDocument('');
    parsed.body.innerHTML = '<neu-slider value="20"></neu-slider>';
    const el = parsed.body.firstElementChild as NeuSlider;
    el.valueFormatter = (v) => `${v}%`;
    document.body.append(document.adoptNode(el));
    expect(el.valueFormatter?.(1)).toBe('1%');
    expect(internalsOf(el).ariaValueText).toBe('20%');
  });

  test('the host is focusable; disabled removes it and sets aria-disabled', () => {
    const el = slider();
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(internalsOf(el).ariaDisabled).toBeNull();
    el.disabled = true;
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(internalsOf(el).ariaDisabled).toBe('true');
  });

  test('renders 1.25rem tall, the height neu.css reserves before the definition runs', () => {
    const el = slider();
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(el.getBoundingClientRect().height).toBe(rem * 1.25);
    expect(getComputedStyle(el).display).toBe('block');
  });

  test('the thumb position follows the value, and the style matches the template', () => {
    const el = slider('min="0" max="200" value="50"');
    const base = el.shadowRoot!.querySelector('.base')!;
    expect(base.getAttribute('style')).toBe('--_neu-pos:0.25');
    el.value = 200;
    expect(base.getAttribute('style')).toBe('--_neu-pos:1');
    el.max = 0;
    expect(base.getAttribute('style')).toBe('--_neu-pos:0');
  });

  describe('keyboard', () => {
    test('keys step, page, jump and flip in RTL; each change fires input then change', () => {
      const el = slider();
      const log = record(el);
      const press = (key: string) => {
        log.length = 0;
        const event = keydown(el, key);
        expect(event.defaultPrevented, key).toBe(true);
        return [...log];
      };
      expect(press('ArrowRight')).toEqual(['input:51', 'change:51']);
      expect(press('ArrowUp')).toEqual(['input:52', 'change:52']);
      expect(press('ArrowLeft')).toEqual(['input:51', 'change:51']);
      expect(press('ArrowDown')).toEqual(['input:50', 'change:50']);
      expect(press('PageUp')).toEqual(['input:60', 'change:60']);
      expect(press('PageDown')).toEqual(['input:50', 'change:50']);
      expect(press('Home')).toEqual(['input:0', 'change:0']);
      expect(press('End')).toEqual(['input:100', 'change:100']);
      // No change, no events; the key is still handled.
      expect(press('End')).toEqual([]);
      expect(press('ArrowRight')).toEqual([]);
      expect(el.value).toBe(100);
    });

    test('Left and Right swap in RTL; Up and Down do not', () => {
      const host = mount<HTMLElement>(
        '<div dir="rtl"><neu-slider value="50" style="inline-size: 220px"></neu-slider></div>',
      );
      const el = host.querySelector('neu-slider') as NeuSlider;
      keydown(el, 'ArrowRight');
      expect(el.value).toBe(49);
      keydown(el, 'ArrowLeft');
      keydown(el, 'ArrowLeft');
      expect(el.value).toBe(51);
      keydown(el, 'ArrowUp');
      expect(el.value).toBe(52);
      keydown(el, 'ArrowDown');
      expect(el.value).toBe(51);
    });

    test('keys use the step, and the page step is a tenth of the range', () => {
      const el = slider('min="0" max="1" step="0.1" value="0.5"');
      keydown(el, 'ArrowRight');
      expect(el.value).toBe(0.6);
      keydown(el, 'PageUp');
      expect(el.value).toBe(0.7);
      const wide = slider('min="0" max="500" step="5" value="100"');
      keydown(wide, 'PageUp');
      expect(wide.value).toBe(150);
    });

    test('a step of 0 or less steps by 1', () => {
      const zero = slider('step="0" value="50"');
      keydown(zero, 'ArrowRight');
      expect(zero.value).toBe(51);
      const negative = slider('step="-3" value="50"');
      keydown(negative, 'ArrowRight');
      expect(negative.value).toBe(51);
      keydown(negative, 'ArrowLeft');
      keydown(negative, 'ArrowLeft');
      expect(negative.value).toBe(49);
    });

    test('other keys are left alone', () => {
      const el = slider();
      const event = keydown(el, 'a');
      expect(event.defaultPrevented).toBe(false);
      expect(el.value).toBe(50);
    });

    test('a disabled slider ignores keys and fires nothing', () => {
      const el = slider('disabled');
      const log = record(el);
      keydown(el, 'ArrowRight');
      keydown(el, 'End');
      expect(el.value).toBe(50);
      expect(log).toEqual([]);
    });
  });

  describe('pointer', () => {
    test('dragging past either end stays in range; change fires once on release', () => {
      const el = slider('value="20" step="5"');
      const log = record(el);
      pointer(el, 'pointerdown', trackX(el, 0.5));
      expect(log).toEqual(['input:50']);
      pointer(el, 'pointermove', trackX(el, 0.75));
      pointer(el, 'pointermove', trackX(el, 0.75));
      expect(log).toEqual(['input:50', 'input:75']);
      pointer(el, 'pointermove', trackX(el, 1) + 500);
      expect(el.value).toBe(100);
      pointer(el, 'pointermove', trackX(el, 0) - 500);
      expect(el.value).toBe(0);
      pointer(el, 'pointerup', trackX(el, 0) - 500);
      expect(log.filter((entry) => entry.startsWith('change'))).toEqual(['change:0']);
      // After release, moves do nothing.
      pointer(el, 'pointermove', trackX(el, 0.5));
      expect(el.value).toBe(0);
      expect(log.at(-1)).toBe('change:0');
    });

    test('losing pointer capture ends the drag: change fires once and hovering moves nothing', () => {
      const el = slider();
      const log = record(el);
      pointer(el, 'pointerdown', trackX(el, 0.25));
      pointer(el, 'lostpointercapture', trackX(el, 0.25));
      expect(log).toEqual(['input:25', 'change:25']);
      pointer(el, 'pointermove', trackX(el, 0.75));
      pointer(el, 'pointerup', trackX(el, 0.75));
      expect(el.value).toBe(25);
      expect(log).toEqual(['input:25', 'change:25']);
    });

    test('a drag that is cut short by removing the slider does not resume when it is put back', () => {
      const el = slider();
      const parent = el.parentElement!;
      pointer(el, 'pointerdown', trackX(el, 0.25));
      el.remove();
      parent.append(el);
      const log = record(el);
      pointer(el, 'pointermove', trackX(el, 0.75));
      expect(el.value).toBe(25);
      expect(log).toEqual([]);
    });

    test('pressing on the track focuses the slider and jumps there', () => {
      const el = slider();
      pointer(el, 'pointerdown', trackX(el, 0.25));
      expect(el.value).toBe(25);
      expect(document.activeElement).toBe(el);
      pointer(el, 'pointerup', trackX(el, 0.25));
    });

    test('a press that changes nothing fires no change', () => {
      const el = slider();
      const log = record(el);
      pointer(el, 'pointerdown', trackX(el, 0.5));
      pointer(el, 'pointerup', trackX(el, 0.5));
      expect(log).toEqual([]);
    });

    test('moving without a press does nothing; pointercancel ends the drag', () => {
      const el = slider();
      const log = record(el);
      pointer(el, 'pointermove', trackX(el, 0.9));
      expect(el.value).toBe(50);
      pointer(el, 'pointerdown', trackX(el, 0.1));
      pointer(el, 'pointercancel', trackX(el, 0.1));
      expect(log).toEqual(['input:10', 'change:10']);
      pointer(el, 'pointermove', trackX(el, 0.9));
      expect(el.value).toBe(10);
    });

    test('only the primary button starts a drag', () => {
      const el = slider();
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 7,
          button: 2,
          clientX: trackX(el, 0.1),
          bubbles: true,
        }),
      );
      expect(el.value).toBe(50);
    });

    test('RTL flips the drag direction', () => {
      const host = mount<HTMLElement>(
        '<div dir="rtl"><neu-slider style="inline-size: 220px"></neu-slider></div>',
      );
      const el = host.querySelector('neu-slider') as NeuSlider;
      pointer(el, 'pointerdown', trackX(el, 0.1));
      expect(el.value).toBe(90);
      pointer(el, 'pointerup', trackX(el, 0.1));
    });

    test('a disabled slider ignores the pointer', () => {
      const el = slider('disabled');
      const log = record(el);
      pointer(el, 'pointerdown', trackX(el, 0.1));
      pointer(el, 'pointermove', trackX(el, 0.9));
      pointer(el, 'pointerup', trackX(el, 0.9));
      expect(el.value).toBe(50);
      expect(log).toEqual([]);
    });
  });

  describe('forms', () => {
    test('submits its value under name; no name submits nothing', () => {
      const form = mountForm(
        '<neu-slider name="v" value="30"></neu-slider><neu-slider></neu-slider>',
      );
      expect([...new FormData(form).entries()]).toEqual([['v', '30']]);
      const el = form.querySelector('neu-slider') as NeuSlider;
      el.value = 80;
      expect(new FormData(form).get('v')).toBe('80');
    });

    test('reset restores the default value, also after an edit', () => {
      const form = mountForm('<neu-slider name="v" value="30"></neu-slider>');
      const el = form.querySelector('neu-slider') as NeuSlider;
      keydown(el, 'End');
      form.reset();
      expect(el.value).toBe(30);
      expect(new FormData(form).get('v')).toBe('30');
      el.setAttribute('value', '45');
      expect(el.value).toBe(45);
    });

    test('state restore sets the value', () => {
      const form = mountForm('<neu-slider name="v"></neu-slider>');
      const el = form.querySelector('neu-slider') as NeuSlider;
      el.formStateRestoreCallback('80');
      expect(el.value).toBe(80);
      expect(new FormData(form).get('v')).toBe('80');
    });

    test('always valid, so user-invalid never turns on', () => {
      const form = mountForm('<neu-slider name="v"></neu-slider>');
      const el = form.querySelector('neu-slider') as NeuSlider;
      keydown(el, 'End');
      expect(el.checkValidity()).toBe(true);
      expect(el.reportValidity()).toBe(true);
      expect(el.matches(':state(user-invalid)')).toBe(false);
      expect(el.willValidate).toBe(true);
    });

    test('a disabled fieldset disables it and drops its value', async () => {
      const form = mountForm(
        '<fieldset disabled><neu-slider name="v" value="30"></neu-slider></fieldset>',
      );
      const el = form.querySelector('neu-slider') as NeuSlider;
      await tick();
      expect(el.matches(':disabled')).toBe(true);
      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(internalsOf(el).ariaDisabled).toBe('true');
      keydown(el, 'End');
      expect(el.value).toBe(30);
      expect(new FormData(form).has('v')).toBe(false);
    });
  });

  test('has no axe violations', async () => {
    const el = slider('label="Volume" value="30"');
    expect(await axeViolations(el)).toEqual([]);
  });
});
