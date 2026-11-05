import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuRadio } from '../../radio.js';
import { NeuRadioGroup } from '../../radio-group.js';
import { renderDSD } from '../../ssr.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  mount,
  mountForm,
  tick,
} from '../../test-utils/helpers.js';
import { cssString } from './radio-group.def.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const THREE =
  '<neu-radio value="a">A</neu-radio><neu-radio value="b">B</neu-radio><neu-radio value="c">C</neu-radio>';

function group(attrs = '', inner = THREE): NeuRadioGroup {
  return mount<NeuRadioGroup>(`<neu-radio-group label="Plan" ${attrs}>${inner}</neu-radio-group>`);
}

const radiosOf = (el: Element) => [...el.querySelectorAll<NeuRadio>('neu-radio')];
const tabindexes = (el: Element) => radiosOf(el).map((radio) => radio.getAttribute('tabindex'));
const checkedOf = (el: Element) => radiosOf(el).map((radio) => radio.checked);

/** The radios the user could reach with Tab. */
const tabStops = (el: Element) =>
  radiosOf(el).filter((radio) => radio.getAttribute('tabindex') === '0');

describe('neu-radio-group', () => {
  test('defaults: no value, vertical, not required, no name', async () => {
    const el = group();
    await tick();
    expect([el.value, el.orientation, el.required, el.disabled, el.name]).toEqual([
      '',
      'vertical',
      false,
      false,
      '',
    ]);
    expect(el.defaultValue).toBe('');
    expect(checkedOf(el)).toEqual([false, false, false]);
  });

  test('role radiogroup; the label is the accessible name; required is exposed', () => {
    const el = group('required');
    expect(internalsOf(el).role).toBe('radiogroup');
    expect(internalsOf(el).ariaLabel).toBe('Plan');
    expect(internalsOf(el).ariaRequired).toBe('true');
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toBe('Plan');
    el.label = 'Tier';
    expect(internalsOf(el).ariaLabel).toBe('Tier');
    el.required = false;
    expect(internalsOf(el).ariaRequired).toBeNull();
  });

  test('reflection: name, required, disabled and orientation reflect; value and label do not', () => {
    const el = group();
    el.name = 'n';
    el.required = true;
    el.disabled = true;
    el.orientation = 'horizontal';
    expect(['name', 'required', 'disabled', 'orientation'].map((a) => el.getAttribute(a))).toEqual([
      'n',
      '',
      '',
      'horizontal',
    ]);
    el.value = 'b';
    el.label = 'Other';
    expect(el.getAttribute('value')).toBeNull();
    expect(el.getAttribute('label')).toBe('Plan');
  });

  test('an invalid orientation falls back to vertical', () => {
    const el = group('orientation="diagonal"');
    expect(el.orientation).toBe('vertical');
  });

  test('the value attribute is the default; the property is the current selection', async () => {
    const el = group('value="b"');
    await tick();
    expect(el.value).toBe('b');
    expect(checkedOf(el)).toEqual([false, true, false]);
    expect(radiosOf(el).map((radio) => internalsOf(radio).ariaChecked)).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(radiosOf(el)[1]!.matches(':state(checked)')).toBe(true);
    el.value = 'c';
    expect(checkedOf(el)).toEqual([false, false, true]);
    expect(el.getAttribute('value')).toBe('b');
    expect(el.defaultValue).toBe('b');
    el.setAttribute('value', 'a');
    expect(el.value).toBe('c');
  });

  test('the first radio with a matching value wins', async () => {
    const el = group(
      'value="x"',
      '<neu-radio value="x">1</neu-radio><neu-radio value="x">2</neu-radio>',
    );
    await tick();
    expect(checkedOf(el)).toEqual([true, false]);
  });

  test('a radio in a nested group belongs to the nested group only', async () => {
    const outer = mount<NeuRadioGroup>(
      '<neu-radio-group value="a"><neu-radio value="a">A</neu-radio><neu-radio-group value="a"><neu-radio value="b">B</neu-radio></neu-radio-group></neu-radio-group>',
    );
    await tick();
    const [a, b] = radiosOf(outer);
    expect([a!.checked, b!.checked]).toEqual([true, false]);
  });

  test('click selects: input then change on the group, with the new value already set', async () => {
    const el = group();
    await tick();
    const events: string[] = [];
    el.addEventListener('input', () => events.push(`input:${el.value}`));
    el.addEventListener('change', () => events.push(`change:${el.value}`));
    await userEvent.click(radiosOf(el)[1]!);
    expect(events).toEqual(['input:b', 'change:b']);
    expect(checkedOf(el)).toEqual([false, true, false]);
    expect(el.matches(':state(user-invalid)')).toBe(false);
  });

  test('input and change are composed and bubble; clicking the selected radio again emits nothing', async () => {
    const el = group('value="a"');
    await tick();
    const seen: [string, boolean, boolean][] = [];
    for (const type of ['input', 'change'])
      el.addEventListener(type, (event) => seen.push([type, event.bubbles, event.composed]));
    radiosOf(el)[0]!.click();
    await tick();
    expect(seen).toEqual([]);
    radiosOf(el)[2]!.click();
    expect(seen).toEqual([
      ['input', true, true],
      ['change', true, true],
    ]);
  });

  test('arrows move and select, wrap, and skip disabled radios; Space selects the focused radio', async () => {
    const el = group(
      '',
      '<neu-radio value="a">A</neu-radio><neu-radio value="b" disabled>B</neu-radio><neu-radio value="c">C</neu-radio><neu-radio value="d">D</neu-radio>',
    );
    await tick();
    const [a, , c, d] = radiosOf(el);
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    a!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect([el.value, document.activeElement]).toEqual(['c', c]);
    expect(events).toEqual(['input', 'change']);
    await userEvent.keyboard('{ArrowRight}');
    expect([el.value, document.activeElement]).toEqual(['d', d]);
    await userEvent.keyboard('{ArrowDown}');
    expect([el.value, document.activeElement]).toEqual(['a', a]);
    await userEvent.keyboard('{ArrowUp}');
    expect([el.value, document.activeElement]).toEqual(['d', d]);
    await userEvent.keyboard('{ArrowLeft}');
    expect([el.value, document.activeElement]).toEqual(['c', c]);
    await userEvent.keyboard('{ArrowLeft}');
    expect([el.value, document.activeElement]).toEqual(['a', a]);
    // Space selects the focused radio; focus alone (Tab) did not.
    events.length = 0;
    el.value = '';
    c!.focus();
    expect(el.value).toBe('');
    expect(keydown(c!, ' ').defaultPrevented).toBe(true);
    expect(el.value).toBe('c');
    expect(events).toEqual(['input', 'change']);
    // Space on the radio that is already selected is silent.
    events.length = 0;
    keydown(c!, ' ');
    expect(events).toEqual([]);
  });

  test('other keys, modified arrows and cancelled keydowns do nothing', async () => {
    const el = group('value="a"');
    await tick();
    const [a] = radiosOf(el);
    a!.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Control>}{ArrowDown}{/Control}');
    expect(el.value).toBe('a');
    a!.addEventListener('keydown', (event) => event.preventDefault());
    await userEvent.keyboard('{ArrowDown}');
    expect(el.value).toBe('a');
  });

  test('exactly one radio is in the tab order as radios are added, removed and disabled', async () => {
    const el = group();
    await tick();
    expect(tabindexes(el)).toEqual(['0', '-1', '-1']);

    el.value = 'b';
    expect(tabindexes(el)).toEqual(['-1', '0', '-1']);

    // Disabling the selected radio hands the stop to the first enabled one; it keeps no tabindex.
    radiosOf(el)[1]!.disabled = true;
    await tick();
    expect(tabindexes(el)).toEqual(['0', null, '-1']);
    radiosOf(el)[1]!.disabled = false;
    await tick();
    expect(tabindexes(el)).toEqual(['-1', '0', '-1']);

    // Adding a radio at the front does not add a second stop.
    el.insertAdjacentHTML('afterbegin', '<neu-radio value="z">Z</neu-radio>');
    await tick();
    expect(tabStops(el)).toHaveLength(1);
    expect(tabStops(el)[0]!.value).toBe('b');

    // Removing the selected radio: the first enabled one is the stop again.
    radiosOf(el)[2]!.remove();
    await tick();
    expect(radiosOf(el).map((radio) => radio.value)).toEqual(['z', 'a', 'c']);
    expect(tabindexes(el)).toEqual(['0', '-1', '-1']);

    // Disabled first radio, the rest get the stop.
    radiosOf(el)[0]!.setAttribute('disabled', '');
    await tick();
    expect(tabindexes(el)).toEqual([null, '0', '-1']);

    // All disabled: no stop at all.
    for (const radio of radiosOf(el)) radio.disabled = true;
    await tick();
    expect(tabindexes(el)).toEqual([null, null, null]);
  });

  test('a value set before its radio exists applies when the radio is added; removing the checked radio clears the selection', async () => {
    const form = mountForm('<neu-radio-group name="g" label="G"></neu-radio-group>');
    const el = form.querySelector('neu-radio-group') as NeuRadioGroup;
    el.value = 'c';
    expect(el.value).toBe('');
    expect(new FormData(form).has('g')).toBe(false);
    el.innerHTML = THREE;
    await tick();
    expect(el.value).toBe('c');
    expect(checkedOf(el)).toEqual([false, false, true]);
    expect(new FormData(form).get('g')).toBe('c');
    expect(tabindexes(el)).toEqual(['-1', '-1', '0']);

    radiosOf(el)[2]!.remove();
    await tick();
    expect(el.value).toBe('');
    expect(checkedOf(el)).toEqual([false, false]);
    expect(new FormData(form).has('g')).toBe(false);
    expect(tabindexes(el)).toEqual(['0', '-1']);
  });

  test('a radio whose value attribute changes is matched again', async () => {
    const el = group('value="x"');
    await tick();
    expect(checkedOf(el)).toEqual([false, false, false]);
    radiosOf(el)[2]!.value = 'x';
    await tick();
    expect(checkedOf(el)).toEqual([false, false, true]);
  });

  test('a radio that leaves the group is no longer checked or disabled by it', async () => {
    const el = group('value="a" disabled');
    await tick();
    const [a] = radiosOf(el);
    expect(a!.checked).toBe(true);
    document.body.append(a!);
    expect([a!.checked, internalsOf(a!).ariaDisabled, a!.hasAttribute('tabindex')]).toEqual([
      false,
      null,
      true,
    ]);
  });

  test('server markup marks the selected radio before any definition runs', async () => {
    const radio = (value: string) =>
      `<neu-radio value="${value}">${renderDSD('neu-radio', { value })}${value}</neu-radio>`;
    const attrs = { value: 'b' };
    const markup = `<neu-radio-group value="b">${renderDSD('neu-radio-group', attrs)}${radio('a')}${radio('b')}${radio('c')}</neu-radio-group>`;
    // A frame that never loads the library keeps neu-radio undefined under its real name.
    const frame = document.createElement('iframe');
    frame.style.cssText =
      'position:absolute;inset-inline-start:0;inset-block-start:0;inline-size:300px;block-size:200px';
    const loaded = new Promise((resolve) =>
      frame.addEventListener('load', resolve, { once: true }),
    );
    frame.srcdoc = `<!doctype html><body>${markup}</body>`;
    document.body.append(frame);
    await loaded;
    const win = frame.contentWindow!;
    expect(win.customElements.get('neu-radio')).toBeUndefined();
    const dots = [...frame.contentDocument!.querySelectorAll('neu-radio')].map(
      (el) => win.getComputedStyle(el.shadowRoot!.querySelector('.indicator')!).transform,
    );
    expect(dots[1]).not.toBe(dots[0]);
    expect(dots[0]).toBe(dots[2]);
  });

  test('the mark rule escapes values, so a value cannot break out of the selector', async () => {
    expect(cssString('a"b\\c\nd')).toBe('a\\22 b\\5c c\\a d');
    expect(cssString("a&b<c>d'e")).not.toMatch(/[&<>']/);
    const el = group('value=\'x"] , neu-radio { color: red } [y="\'');
    await tick();
    const mark = el.shadowRoot!.querySelector('style')!;
    expect(mark.textContent).not.toContain('"] ,');
    expect(mark.sheet!.cssRules).toHaveLength(1);
    // The same text comes back from the server template.
    expect(renderDSD('neu-radio-group', { value: 'x"y&z' })).toContain('value="x\\22 y\\26 z"');
  });

  test('the mark rule follows the current value and is empty without one', async () => {
    const el = group();
    await tick();
    const mark = el.shadowRoot!.querySelector('style')!;
    expect(mark.textContent).toBe('');
    el.value = 'b';
    expect(mark.textContent).toBe('::slotted(neu-radio[value="b"]){--_neu-radio-on:1}');
  });

  test('a disabled group (attribute or fieldset) disables every radio and emits nothing', async () => {
    const form = mountForm(
      `<neu-radio-group value="a">${THREE}</neu-radio-group><fieldset disabled><neu-radio-group value="a">${THREE}</neu-radio-group></fieldset>`,
    );
    const [byAttribute, byFieldset] = [
      ...form.querySelectorAll('neu-radio-group'),
    ] as NeuRadioGroup[];
    byAttribute!.disabled = true;
    await tick();
    for (const el of [byAttribute!, byFieldset!]) {
      const events: string[] = [];
      for (const type of ['click', 'input', 'change'])
        el.addEventListener(type, () => events.push(type));
      expect(internalsOf(el).ariaDisabled).toBe('true');
      expect(radiosOf(el).map((radio) => internalsOf(radio).ariaDisabled)).toEqual([
        'true',
        'true',
        'true',
      ]);
      expect(tabindexes(el)).toEqual([null, null, null]);
      radiosOf(el)[1]!.click();
      el.click();
      await tick();
      expect(events).toEqual([]);
      expect(el.value).toBe('a');
      expect(checkedOf(el)).toEqual([true, false, false]);
    }
    byAttribute!.disabled = false;
    await tick();
    expect(tabindexes(byAttribute!)).toEqual(['0', '-1', '-1']);
    expect(internalsOf(radiosOf(byAttribute!)[0]!).ariaDisabled).toBeNull();
  });

  test('a disabled radio cannot be clicked or reached with the arrows', async () => {
    const el = group(
      '',
      '<neu-radio value="a">A</neu-radio><neu-radio value="b" disabled>B</neu-radio>',
    );
    await tick();
    const events: string[] = [];
    el.addEventListener('change', () => events.push('change'));
    radiosOf(el)[1]!.click();
    await tick();
    expect([events, el.value]).toEqual([[], '']);
  });

  test('a disabled group looks disabled, also inside a fieldset', () => {
    const form = mountForm(
      `<fieldset disabled><neu-radio-group>${THREE}</neu-radio-group></fieldset><neu-radio-group disabled>${THREE}</neu-radio-group>`,
    );
    const looks = [...form.querySelectorAll('neu-radio-group')].map((el) => [
      getComputedStyle(el).cursor,
      getComputedStyle(el.shadowRoot!.querySelector('.items')!).opacity,
    ]);
    expect(looks).toEqual([
      ['not-allowed', '0.55'],
      ['not-allowed', '0.55'],
    ]);
  });

  test('horizontal groups lay the radios in a row', () => {
    const vertical = group();
    const horizontal = group('orientation="horizontal"');
    const direction = (el: Element) =>
      getComputedStyle(el.shadowRoot!.querySelector('.items')!).flexDirection;
    expect([direction(vertical), direction(horizontal)]).toEqual(['column', 'row']);
  });

  test('FormData has name=value; reset restores the default; required with no selection is valueMissing', async () => {
    const form = mountForm(
      `<neu-radio-group name="plan" value="b" required>${THREE}</neu-radio-group>`,
    );
    const el = form.querySelector('neu-radio-group') as NeuRadioGroup;
    await tick();
    expect(new FormData(form).get('plan')).toBe('b');
    expect(el.validity.valid).toBe(true);
    await userEvent.click(radiosOf(el)[2]!);
    expect(new FormData(form).get('plan')).toBe('c');
    form.reset();
    expect(el.value).toBe('b');
    expect(checkedOf(el)).toEqual([false, true, false]);
    expect(new FormData(form).get('plan')).toBe('b');

    const bare = mountForm(`<neu-radio-group name="p" required>${THREE}</neu-radio-group>`);
    const empty = bare.querySelector('neu-radio-group') as NeuRadioGroup;
    await tick();
    expect(new FormData(bare).has('p')).toBe(false);
    expect(empty.validity.valueMissing).toBe(true);
    expect(empty.validationMessage).not.toBe('');
    expect(empty.checkValidity()).toBe(false);
    empty.value = 'a';
    expect(empty.validity.valid).toBe(true);
  });

  test(':state(user-invalid) only appears after interaction', async () => {
    const form = mountForm(`<neu-radio-group name="p" required>${THREE}</neu-radio-group>`);
    const el = form.querySelector('neu-radio-group') as NeuRadioGroup;
    await tick();
    expect(el.matches(':state(user-invalid)')).toBe(false);
    el.checkValidity();
    expect(el.matches(':state(user-invalid)')).toBe(false);
    el.reportValidity();
    expect(el.matches(':state(user-invalid)')).toBe(true);
    radiosOf(el)[0]!.click();
    expect(el.matches(':state(user-invalid)')).toBe(false);
  });

  test('state is restored after navigation', async () => {
    const form = mountForm(`<neu-radio-group name="p">${THREE}</neu-radio-group>`);
    const el = form.querySelector('neu-radio-group') as NeuRadioGroup;
    await tick();
    el.formStateRestoreCallback('c');
    expect([el.value, checkedOf(el)]).toEqual(['c', [false, false, true]]);
    expect(new FormData(form).get('p')).toBe('c');
  });

  test('the group is associated with its form', () => {
    const form = mountForm(`<neu-radio-group name="p">${THREE}</neu-radio-group>`);
    const el = form.querySelector('neu-radio-group') as NeuRadioGroup;
    expect(el.form).toBe(form);
  });

  test('has no axe violations, plain and with a selection and a disabled radio', async () => {
    const el = mount<HTMLDivElement>(
      `<div><neu-radio-group label="Plan" value="b">${THREE}</neu-radio-group><neu-radio-group label="Size" required><neu-radio value="s">S</neu-radio><neu-radio value="m" disabled>M</neu-radio></neu-radio-group></div>`,
    );
    await tick();
    expect(await axeViolations(el)).toEqual([]);
  });
});
