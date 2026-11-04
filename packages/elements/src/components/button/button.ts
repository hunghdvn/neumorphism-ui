import { afterDispatch, isActiveInRoot } from '../../core/dom.js';
import { markSubmitAttempt } from '../../core/form-control.js';
import { NeuElement } from '../../core/neu-element.js';
import { buttonDef } from './button.def.js';

export class NeuButton extends NeuElement {
  static override def = buttonDef;
  /** Form-associated only to reach internals.form; a button contributes no value. */
  static formAssociated = true;
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
    } else if (event.key === ' ') {
      // Arm after the whole dispatch, so a listener further up can still claim the key. From
      // window this runs before the default action, so cancelling here still stops the scroll.
      afterDispatch(event, () => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        this.toggleState('pressed', true);
      });
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
