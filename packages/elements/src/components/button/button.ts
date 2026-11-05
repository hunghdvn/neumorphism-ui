import { afterDispatch, isActiveInRoot } from '../../core/dom.js';
import { markSubmitAttempt, SUBMITS } from '../../core/form-control.js';
import type { ComponentDef } from '../../core/define.js';
import { NeuElement } from '../../core/neu-element.js';
import { buttonDef } from './button.def.js';

export class NeuButton extends NeuElement {
  static override def: ComponentDef = buttonDef;
  /** Form-associated only to reach internals.form; a button contributes no value. */
  static formAssociated = true;
  /** type="submit" submits the form, so this class and its subclasses can be the default button. */
  static readonly [SUBMITS] = true;
  declare variant: 'default' | 'primary' | 'flat';
  declare size: 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare loading: boolean;
  declare type: 'button' | 'submit' | 'reset';

  constructor() {
    super();
    this.internals.role = 'button';
    this.addEventListener('click', (event) => this.onClickCapture(event), { capture: true });
    this.addEventListener('click', (event) => this.onClick(event));
    this.addEventListener('keydown', (event) => this.onKeyDown(event));
    this.addEventListener('keyup', (event) => this.onKeyUp(event));
    // Disarm when focus moves away, not when only the window loses focus.
    this.addEventListener('blur', () => {
      if (!isActiveInRoot(this)) this.toggleState('pressed', false);
    });
    // Focus coming back means Space may have been released while it was away.
    this.addEventListener('focus', () => this.toggleState('pressed', false));
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  private get inactive(): boolean {
    return this.isDisabled || this.props.loading === true;
  }

  /** The base class already swallows clicks while disabled; loading needs the same. */
  private onClickCapture(event: Event): void {
    if (this.props.loading !== true) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  /** Like a native button: submit or reset once the click has dispatched, unless it was cancelled. */
  private onClick(event: Event): void {
    afterDispatch(event, () => {
      const form = this.internals.form;
      if (event.defaultPrevented || !form) return;
      if (this.props.type === 'submit') {
        markSubmitAttempt(form);
        // No submitter (spec §7.1): new FormData(form, host) would throw for a non-native one.
        form.requestSubmit();
      } else if (this.props.type === 'reset') {
        form.reset();
      }
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.inactive) return;
    if (event.key === 'Enter') {
      // Not cancelled here, so a handler further up can still cancel the activation.
      afterDispatch(event, () => {
        if (!event.defaultPrevented && !this.inactive) this.click();
      });
    } else if (event.key === ' ' && !event.defaultPrevented) {
      // Cancelled at once: deferred, an ancestor that stops propagation would let the page scroll.
      // An ancestor claims Space in the capture phase, or by cancelling the keyup.
      event.preventDefault();
      this.toggleState('pressed', true);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key !== ' ' || !this.internals.states.has('pressed')) return;
    this.toggleState('pressed', false);
    afterDispatch(event, () => {
      if (!event.defaultPrevented && !this.inactive) this.click();
    });
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled') || changed.has('loading')) {
      this.syncDisabledState();
      this.internals.ariaBusy = this.props.loading === true ? 'true' : null;
    }
  }
}
