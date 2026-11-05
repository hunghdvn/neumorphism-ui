import { afterEach, describe, expect, it } from 'vitest';
import { keydown, keyup, mount, tick } from '../../test-utils/helpers.js';
import { pressable, type EnterMode } from './press.js';

let inactive = false;
let mode: EnterMode = 'repeat';

/** Minimal host: the mode is read when the element is created. */
class PressProbe extends HTMLElement {
  clicks = 0;
  constructor() {
    super();
    const internals = this.attachInternals();
    pressable(this, internals.states, mode, () => inactive);
    this.addEventListener('click', () => this.clicks++);
  }
}
customElements.define('neu-press-probe', PressProbe);

function probe(enter: EnterMode): PressProbe {
  mode = enter;
  return mount<PressProbe>('<neu-press-probe tabindex="0"></neu-press-probe>');
}

function repeatDown(el: Element, value: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: value,
    repeat: true,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

afterEach(() => {
  inactive = false;
  document.body.replaceChildren();
});

describe('pressable', () => {
  it('Space clicks on keyup only after its own keydown', async () => {
    const el = probe('none');
    keyup(el, ' ');
    await tick();
    expect(el.clicks).toBe(0);
    const down = keydown(el, ' ');
    expect(down.defaultPrevented).toBe(true);
    expect(el.matches(':state(pressed)')).toBe(true);
    expect(el.clicks).toBe(0);
    keyup(el, ' ');
    await tick();
    expect(el.matches(':state(pressed)')).toBe(false);
    expect(el.clicks).toBe(1);
  });

  it('Enter: repeat clicks on every keydown, once ignores repeats, none never clicks', async () => {
    const repeat = probe('repeat');
    keydown(repeat, 'Enter');
    repeatDown(repeat, 'Enter');
    await tick();
    expect(repeat.clicks).toBe(2);

    const once = probe('once');
    keydown(once, 'Enter');
    repeatDown(once, 'Enter');
    await tick();
    expect(once.clicks).toBe(1);

    const none = probe('none');
    keydown(none, 'Enter');
    await tick();
    expect(none.clicks).toBe(0);
  });

  it('inactive blocks arming and clicking', async () => {
    const el = probe('repeat');
    inactive = true;
    const down = keydown(el, ' ');
    expect(down.defaultPrevented).toBe(false);
    expect(el.matches(':state(pressed)')).toBe(false);
    keydown(el, 'Enter');
    await tick();
    expect(el.clicks).toBe(0);

    // Armed while active, then deactivated before keyup: no click.
    inactive = false;
    keydown(el, ' ');
    inactive = true;
    keyup(el, ' ');
    await tick();
    expect(el.clicks).toBe(0);
  });

  it('a cancelled keyup does not click', async () => {
    const el = probe('none');
    el.addEventListener('keyup', (event) => event.preventDefault());
    keydown(el, ' ');
    keyup(el, ' ');
    await tick();
    expect(el.matches(':state(pressed)')).toBe(false);
    expect(el.clicks).toBe(0);
  });
});
