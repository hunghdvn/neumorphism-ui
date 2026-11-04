import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuButton } from '../../button.js';
import { NeuTextField } from '../../text-field.js';
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

  test('a tabindex the author sets later is the one restored after a disabled toggle', () => {
    // Roving tabindex: the app makes the button inactive after it connected.
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    el.setAttribute('tabindex', '-1');
    el.disabled = true;
    expect(el.hasAttribute('tabindex')).toBe(false);
    el.disabled = false;
    expect(el.getAttribute('tabindex')).toBe('-1');
    // A framework changing tabIndex after mount.
    el.setAttribute('tabindex', '2');
    el.disabled = true;
    el.disabled = false;
    expect(el.getAttribute('tabindex')).toBe('2');
    // Dropping it returns to the default.
    el.removeAttribute('tabindex');
    el.disabled = true;
    el.disabled = false;
    expect(el.getAttribute('tabindex')).toBe('0');
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

  test('the window losing focus between Space down and up does not disarm it', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    el.focus();
    keydown(el, ' ');
    // Deactivating the window or frame fires blur, but the element stays the active element.
    el.dispatchEvent(new FocusEvent('blur'));
    keyup(el, ' ');
    await tick();
    expect(clicks()).toBe(1);
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

  test('submit triggered by a neu-button exposes it as SubmitEvent.submitter', async () => {
    const form = mountForm('<neu-button type="submit">Go</neu-button>');
    const button = form.querySelector('neu-button') as NeuButton;
    const submitters: unknown[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitters.push((event as SubmitEvent).submitter);
    });
    await userEvent.click(button);
    expect(submitters).toEqual([button]);
  });

  test('a submit click on an invalid form leaves no submitter claim behind', async () => {
    const form = mountForm(
      '<neu-text-field label="Q" name="q" required></neu-text-field><neu-button type="submit">Go</neu-button>' +
        '<button type="submit" id="native">Native</button>',
    );
    const button = form.querySelector('neu-button') as NeuButton;
    const submitters: unknown[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitters.push((event as SubmitEvent).submitter);
    });
    await userEvent.click(button);
    await tick();
    expect(submitters).toEqual([]);
    (form.querySelector('neu-text-field') as NeuTextField).value = 'x';
    const native = form.querySelector('#native') as HTMLButtonElement;
    form.requestSubmit(native);
    expect(submitters).toEqual([native]);
    form.requestSubmit();
    expect(submitters[1]).toBeNull();
  });

  test('implicit submission from a text field exposes the default button as submitter', async () => {
    const form = mountForm(
      '<neu-text-field label="Q" name="q"></neu-text-field><neu-button type="submit">Go</neu-button>',
    );
    const button = form.querySelector('neu-button') as NeuButton;
    const submitters: unknown[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitters.push((event as SubmitEvent).submitter);
    });
    (form.querySelector('neu-text-field') as NeuTextField).focus();
    await userEvent.keyboard('{Enter}');
    await tick();
    expect(submitters).toEqual([button]);
  });

  test('el.click() on a submit button submits before it returns', () => {
    const form = mountForm('<neu-button type="submit">Go</neu-button>');
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    (form.querySelector('neu-button') as NeuButton).click();
    expect(submitted).toBe(1);
  });

  test('a host click listener that calls preventDefault stops submit and reset', async () => {
    const form = mountForm(
      '<input name="q" value="a"><neu-button type="submit">Go</neu-button>' +
        '<neu-button type="reset">Reset</neu-button>',
    );
    const events: string[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      events.push('submit');
    });
    form.addEventListener('reset', () => events.push('reset'));
    const [submit, reset] = form.querySelectorAll<NeuButton>('neu-button');
    for (const button of [submit!, reset!]) {
      button.addEventListener('click', (event) => event.preventDefault());
    }
    await userEvent.click(submit!);
    await userEvent.click(reset!);
    submit!.click();
    reset!.click();
    await tick();
    expect(events).toEqual([]);
  });

  test('a document click listener that calls preventDefault stops submit and reset', async () => {
    const form = mountForm(
      '<input name="q" value="a"><neu-button type="submit">Go</neu-button>' +
        '<neu-button type="reset">Reset</neu-button>',
    );
    const events: string[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      events.push('submit');
    });
    form.addEventListener('reset', () => events.push('reset'));
    const cancel = (event: Event) => event.preventDefault();
    document.addEventListener('click', cancel);
    try {
      const [submit, reset] = form.querySelectorAll<NeuButton>('neu-button');
      await userEvent.click(submit!);
      await userEvent.click(reset!);
      submit!.click();
      reset!.click();
      await tick();
      expect(events).toEqual([]);
    } finally {
      document.removeEventListener('click', cancel);
    }
  });

  test('Enter is left uncancelled; a document keydown listener that cancels it stops activation', async () => {
    const form = mountForm('<neu-button type="submit">Go</neu-button>');
    let submitted = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted++;
    });
    const el = form.querySelector('neu-button') as NeuButton;
    const clicks = countClicks(el);
    const cancelEnter = (event: KeyboardEvent) => {
      if (event.key === 'Enter') event.preventDefault();
    };
    document.addEventListener('keydown', cancelEnter);
    try {
      el.focus();
      await userEvent.keyboard('{Enter}');
      expect(keydown(el, 'Enter').defaultPrevented).toBe(true);
      await tick();
      expect([clicks(), submitted]).toEqual([0, 0]);
    } finally {
      document.removeEventListener('keydown', cancelEnter);
    }
    expect(keydown(el, 'Enter').defaultPrevented).toBe(false);
    expect([clicks(), submitted]).toEqual([1, 1]);
  });

  test('a Space keydown cancelled before it reaches the button does not arm it', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    const cancelSpace = (event: KeyboardEvent) => {
      if (event.key === ' ') event.preventDefault();
    };
    document.addEventListener('keydown', cancelSpace, { capture: true });
    try {
      keydown(el, ' ');
      expect(el.matches(':state(pressed)')).toBe(false);
      keyup(el, ' ');
      await tick();
      expect(clicks()).toBe(0);
    } finally {
      document.removeEventListener('keydown', cancelSpace, { capture: true });
    }
  });

  test('a Space keydown cancelled by an ancestor in the bubble phase does not arm', async () => {
    const form = mountForm('<neu-button>Save</neu-button>');
    const el = form.querySelector('neu-button') as NeuButton;
    const clicks = countClicks(el);
    form.addEventListener('keydown', (event) => event.preventDefault());
    keydown(el, ' ');
    expect(el.matches(':state(pressed)')).toBe(false);
    keyup(el, ' ');
    await tick();
    expect(clicks()).toBe(0);
  });

  test('Space still arms when an ancestor stops propagation without cancelling', async () => {
    // Plan ruling 10: the keydown never reaches window, so the button arms a task later.
    const form = mountForm('<neu-button>Save</neu-button>');
    const el = form.querySelector('neu-button') as NeuButton;
    const clicks = countClicks(el);
    form.addEventListener('keydown', (event) => event.stopPropagation());
    keydown(el, ' ');
    await tick();
    expect(el.matches(':state(pressed)')).toBe(true);
    keyup(el, ' ');
    await tick();
    expect(clicks()).toBe(1);
  });

  test('pressed is cleared when the element regains focus', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    el.focus();
    keydown(el, ' ');
    // The window loses focus (the element stays active), and Space is released elsewhere.
    el.dispatchEvent(new FocusEvent('blur'));
    expect(el.matches(':state(pressed)')).toBe(true);
    el.dispatchEvent(new FocusEvent('focus'));
    expect(el.matches(':state(pressed)')).toBe(false);
    keyup(el, ' ');
    await tick();
    expect(clicks()).toBe(0);
  });

  test('a keyup listener that calls preventDefault stops the Space activation', async () => {
    const el = mount<NeuButton>('<neu-button>Save</neu-button>');
    const clicks = countClicks(el);
    el.addEventListener('keyup', (event) => event.preventDefault());
    keydown(el, ' ');
    keyup(el, ' ');
    await tick();
    expect(clicks()).toBe(0);
    expect(el.matches(':state(pressed)')).toBe(false);
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
