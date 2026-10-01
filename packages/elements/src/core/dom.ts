/** Writes text only when it changed, so hydrated nodes are not replaced needlessly. */
export function setText(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

/** Sets the attribute when value is non-empty and removes it otherwise. */
export function setOptionalAttribute(el: Element | null, name: string, value: string): void {
  if (!el) return;
  if (value === '') el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

/** Dispatches a bubbling, composed event from a host (spec §6.4). */
export function dispatch(target: EventTarget, type: string): void {
  target.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
}
