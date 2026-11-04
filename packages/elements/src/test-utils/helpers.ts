import axe from 'axe-core';

export function mount<T extends Element = HTMLElement>(markup: string): T {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.firstElementChild as T;
}

export function mountForm(inner: string): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = inner;
  document.body.append(form);
  return form;
}

/** Reads the protected ElementInternals of a component for ARIA assertions. */
export function internalsOf(el: Element): ElementInternals {
  return (el as unknown as { internals: ElementInternals }).internals;
}

/** axe-core with color-contrast disabled (spec decision A: pure neumorphism). */
export async function axeViolations(context: Element): Promise<string[]> {
  const result = await axe.run(context, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

function key(type: 'keydown' | 'keyup', el: Element, value: string): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    key: value,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

export const keydown = (el: Element, value: string) => key('keydown', el, value);
export const keyup = (el: Element, value: string) => key('keyup', el, value);

/** Waits one macrotask, which flushes microtask-deferred events. */
export const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
