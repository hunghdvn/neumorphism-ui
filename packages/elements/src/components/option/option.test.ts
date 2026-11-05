import { afterEach, describe, expect, test } from 'vitest';
import { NeuOption } from '../../option.js';
import { internalsOf, mount } from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('neu-option', () => {
  test('is hidden and carries value (or its label) and disabled', () => {
    const el = mount<NeuOption>('<neu-option>  Gold \n  plan </neu-option>');
    expect(el).toBeInstanceOf(NeuOption);
    expect(getComputedStyle(el).display).toBe('none');
    expect(el.getBoundingClientRect().height).toBe(0);
    expect(internalsOf(el).role).toBeNull();
    // Like a native option: no value attribute means the label, whitespace collapsed.
    expect([el.label, el.value, el.disabled]).toEqual(['Gold plan', 'Gold plan', false]);
    expect(el.hasAttribute('value')).toBe(false);
    el.value = 'gold';
    el.disabled = true;
    expect([el.getAttribute('value'), el.getAttribute('disabled')]).toEqual(['gold', '']);
    expect([el.value, el.label]).toEqual(['gold', 'Gold plan']);
    el.setAttribute('value', '');
    expect(el.value).toBe('');
    el.removeAttribute('value');
    el.removeAttribute('disabled');
    expect([el.value, el.disabled]).toEqual(['Gold plan', false]);
  });

  test('stays hidden even when an author sets display on it', () => {
    const el = mount<NeuOption>('<neu-option value="a" style="display:block">A</neu-option>');
    expect(getComputedStyle(el).display).toBe('none');
  });

  test('the shadow tree is a single default slot', () => {
    const el = mount<NeuOption>('<neu-option>A</neu-option>');
    expect(el.shadowRoot!.innerHTML).toBe('<slot></slot>');
  });
});
