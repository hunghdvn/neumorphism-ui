import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuButton } from '../../button.js';
import {
  axeViolations,
  internalsOf,
  keydown,
  keyup,
  mount,
  mountForm,
} from '../../test-utils/helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function countClicks(el: Element): () => number {
  let clicks = 0;
  el.addEventListener('click', () => clicks++);
  return () => clicks;
}

describe('neu-button', () => {
  test('defaults: role button, focusable, type=button, variant=default, size=md', () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    expect(el).toBeInstanceOf(NeuButton);
    expect(internalsOf(el).role).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect([el.type, el.variant, el.size]).toEqual(['button', 'default', 'md']);
  });

  test('exposes the documented parts', () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const parts = [...el.shadowRoot!.querySelectorAll('[part]')].map((p) => p.getAttribute('part'));
    expect(parts).toEqual(['base', 'prefix', 'label', 'suffix', 'spinner']);
  });

  test('an invalid variant falls back to default', () => {
    expect(mount<NeuButton>('<neu-button variant="huge">Save</neu-button>').variant).toBe(
      'default',
    );
  });

  test('click fires normally', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    await userEvent.click(el);
    expect(clicks()).toBe(1);
  });

  test('disabled: no click event, not focusable, aria-disabled', () => {
    const el = mount<NeuButton>('<neu-button disabled>Save</neu-button>');
    const clicks = countClicks(el);
    el.click();
    expect(clicks()).toBe(0);
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(internalsOf(el).ariaDisabled).toBe('true');
    el.disabled = false;
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(internalsOf(el).ariaDisabled).toBeNull();
  });

  test('keeps an author tabindex, drops it while disabled and restores it afterwards', () => {
    const el = mount<NeuButton>('<neu-button tabindex="-1">Save</neu-button>');
    expect(el.getAttribute('tabindex')).toBe('-1');
    el.disabled = true;
    expect(el.hasAttribute('tabindex')).toBe(false);
    el.disabled = false;
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  test('loading: no click event, still focusable, aria-busy', () => {
    const el = mount<NeuButton>('<neu-button loading>Save</neu-button>');
    const clicks = countClicks(el);
    el.click();
    expect(clicks()).toBe(0);
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(internalsOf(el).ariaBusy).toBe('true');
  });

  test('Enter activates on keydown; Space activates on keyup', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(clicks()).toBe(1);
    expect(keydown(el, ' ').defaultPrevented).toBe(true);
    expect(clicks()).toBe(1);
    expect(el.matches(':state(pressed)')).toBe(true);
    keyup(el, ' ');
    expect(clicks()).toBe(2);
    expect(el.matches(':state(pressed)')).toBe(false);
  });

  test('Space released after blur does not activate', () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    el.focus();
    keydown(el, ' ');
    el.blur();
    keyup(el, ' ');
    expect(clicks()).toBe(0);
  });

  test('type=submit submits, type=reset resets, type=button does neither', async () => {
    const form = mountForm(
      '<input name="q" value="a"><neu-button type="submit">Go</neu-button>' +
        '<neu-button type="reset">Reset</neu-button><neu-button>Noop</neu-button>',
    );
    const events: string[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      events.push('submit');
    });
    form.addEventListener('reset', () => events.push('reset'));
    const [submit, reset, noop] = form.querySelectorAll('neu-button');
    await userEvent.click(submit!);
    await userEvent.click(reset!);
    await userEvent.click(noop!);
    expect(events).toEqual(['submit', 'reset']);
  });

  test('a disabled fieldset disables the button', () => {
    const form = mountForm(
      '<fieldset disabled><neu-button type="submit">Go</neu-button></fieldset>',
    );
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    const button = form.querySelector('neu-button') as NeuButton;
    button.click();
    expect(submitted).toBe(0);
    expect(button.hasAttribute('tabindex')).toBe(false);
  });

  test('a disabled fieldset styles it like the disabled attribute', () => {
    const form = mountForm(
      '<fieldset disabled><neu-button>A</neu-button></fieldset><neu-button disabled>B</neu-button>',
    );
    const looks = [...form.querySelectorAll('neu-button')].map((el) => [
      getComputedStyle(el).cursor,
      getComputedStyle(el.shadowRoot!.querySelector('.base')!).boxShadow,
    ]);
    expect(looks).toEqual([
      ['not-allowed', 'none'],
      ['not-allowed', 'none'],
    ]);
  });

  test('has no axe violations', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    expect(await axeViolations(el.parentElement!)).toEqual([]);
  });
});
