import { afterDispatch, isActiveInRoot } from '../../core/dom.js';

/** How Enter activates: on every keydown, only on the first, or not at all. */
export type EnterMode = 'repeat' | 'once' | 'none';

/**
 * Native-like keyboard activation shared by button, switch and checkbox: Space arms on keydown and
 * clicks on keyup, Enter clicks on keydown. `inactive` blocks both arming and clicking.
 */
export function pressable(
  host: HTMLElement,
  states: CustomStateSet,
  enter: EnterMode,
  inactive: () => boolean,
): void {
  const press = (on: boolean) => (on ? states.add('pressed') : states.delete('pressed'));
  // Not cancelled at the keydown/keyup itself, so a handler further up can still cancel the click.
  const clickUnlessCancelled = (event: Event) =>
    afterDispatch(event, () => {
      if (!event.defaultPrevented && !inactive()) host.click();
    });

  host.addEventListener('keydown', (event) => {
    if (inactive()) return;
    if (event.key === ' ') {
      if (event.defaultPrevented) return;
      // Cancelled at once: deferred, an ancestor that stops propagation would let the page scroll.
      // An ancestor claims Space in the capture phase, or by cancelling the keyup.
      event.preventDefault();
      press(true);
    } else if (
      event.key === 'Enter' &&
      (enter === 'repeat' || (enter === 'once' && !event.repeat))
    ) {
      clickUnlessCancelled(event);
    }
  });
  host.addEventListener('keyup', (event) => {
    if (event.key !== ' ' || !states.has('pressed')) return;
    press(false);
    clickUnlessCancelled(event);
  });
  // Disarm when focus moves away, not when only the window loses focus.
  host.addEventListener('blur', () => {
    if (!isActiveInRoot(host)) press(false);
  });
  // Focus coming back means Space may have been released while it was away.
  host.addEventListener('focus', () => press(false));
}
