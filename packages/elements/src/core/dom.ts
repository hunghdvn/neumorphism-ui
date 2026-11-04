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

/**
 * True while `el` is the focused element of its tree. It stays true when only the window or frame
 * loses focus, which also fires blur on the element; it is false once focus moved elsewhere.
 */
export function isActiveInRoot(el: Element): boolean {
  return (el.getRootNode() as Partial<DocumentOrShadowRoot>).activeElement === el;
}

/** Dispatches a bubbling, composed event from a host (spec §6.4). */
export function dispatch(target: EventTarget, type: string): void {
  target.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
}

/**
 * Runs `run` once `event` has finished dispatching — after every listener, including those on
 * window — or on the next task if propagation was stopped before window. Runs exactly once.
 *
 * A one-shot bubble listener on window catches this same event object, so `run` lands within the
 * dispatch, after the listeners on the way up, and sees their preventDefault(). Not a microtask:
 * for a trusted event the microtask queue drains between listeners. An event that never reaches
 * window (stopPropagation, bubbles: false, a disconnected target) is finished by the timeout.
 */
export function afterDispatch(event: Event, run: () => void): void {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener(event.type, onWindow);
    clearTimeout(fallback);
    run();
  };
  const onWindow = (other: Event) => {
    if (other === event) finish();
  };
  window.addEventListener(event.type, onWindow);
  const fallback = setTimeout(finish, 0);
}
