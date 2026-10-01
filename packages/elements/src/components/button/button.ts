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
    this.addEventListener('click', () => this.onClick());
    this.addEventListener('keydown', (event) => this.onKeyDown(event));
    this.addEventListener('keyup', (event) => this.onKeyUp(event));
    this.addEventListener('blur', () => this.toggleState('pressed', false));
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

  private onClick(): void {
    const form = this.internals.form;
    if (!form) return;
    if (this.props.type === 'submit') form.requestSubmit();
    else if (this.props.type === 'reset') form.reset();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.inactive) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.click();
    } else if (event.key === ' ') {
      event.preventDefault();
      this.toggleState('pressed', true);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key !== ' ' || !this.internals.states.has('pressed')) return;
    this.toggleState('pressed', false);
    if (!this.inactive) this.click();
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled') || changed.has('loading')) {
      this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
      this.internals.ariaBusy = this.props.loading === true ? 'true' : null;
      this.syncFocusable(!this.isDisabled);
    }
  }
}
