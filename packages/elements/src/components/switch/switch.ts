import { afterDispatch, dispatch, isActiveInRoot } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { requiredCheckboxMessage } from '../../core/validation.js';
import { switchDef } from './switch.def.js';

export class NeuSwitch extends FormControlElement {
  static override def = switchDef;
  static override extraProperties = ['defaultChecked'];
  declare name: string;
  declare value: string;
  declare disabled: boolean;
  declare required: boolean;
  declare size: 'sm' | 'md' | 'lg';
  private current: boolean;
  private dirty = false;

  constructor() {
    super();
    this.current = this.props.checked === true;
    this.internals.role = 'switch';
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

  get checked(): boolean {
    return this.current;
  }
  set checked(value: boolean) {
    this.dirty = true;
    this.setCurrent(Boolean(value));
  }

  get defaultChecked(): boolean {
    return this.props.checked === true;
  }
  set defaultChecked(value: boolean) {
    this.toggleAttribute('checked', Boolean(value));
  }

  /**
   * Native checkbox order: flip now, let click listeners see it, then input + change once the
   * click has finished dispatching (within it, unless propagation was stopped before window).
   */
  private onClick(event: Event): void {
    const before = this.current;
    this.dirty = true;
    this.setCurrent(!before);
    afterDispatch(event, () => {
      if (event.defaultPrevented) {
        this.setCurrent(before);
      } else if (this.isConnected && this.current === !before) {
        this.markInteracted();
        dispatch(this, 'input');
        dispatch(this, 'change');
      }
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      // Arm after the whole dispatch, so a listener further up can still claim the key. From
      // window this runs before the default action, so cancelling here still stops the scroll.
      afterDispatch(event, () => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        this.toggleState('pressed', true);
      });
    } else if (event.key === 'Enter' && !event.repeat) {
      // Not cancelled here, so a handler further up can still cancel the toggle.
      afterDispatch(event, () => {
        if (!event.defaultPrevented) this.click();
      });
    }
  }

  /** Like a native checkbox, Space toggles on keyup only after its own keydown. */
  private onKeyUp(event: KeyboardEvent): void {
    if (event.key !== ' ' || !this.internals.states.has('pressed')) return;
    this.toggleState('pressed', false);
    afterDispatch(event, () => {
      if (!event.defaultPrevented) this.click();
    });
  }

  private setCurrent(value: boolean): void {
    this.current = value;
    this.toggleState('checked', value);
    this.internals.ariaChecked = value ? 'true' : 'false';
    this.ref('track')?.classList.toggle('on', value);
    this.commit();
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('checked') && !this.dirty) this.current = this.props.checked === true;
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled')) this.syncDisabledState();
    if (changed.has('checked')) this.setCurrent(this.current);
    else if (changed.has('required') || changed.has('value')) this.commit();
  }

  protected formValue(): string | null {
    return this.current ? String(this.props.value) : null;
  }
  protected override formState(): string {
    return this.current ? 'checked' : 'unchecked';
  }
  protected validate(): void {
    if (this.props.required === true && !this.current) {
      this.internals.setValidity(
        { valueMissing: true },
        requiredCheckboxMessage(),
        this.ref('track') ?? undefined,
      );
    } else {
      this.internals.setValidity({});
    }
  }
  protected resetToDefault(): void {
    this.dirty = false;
    this.setCurrent(this.props.checked === true);
  }
  protected restoreState(state: string): void {
    this.dirty = true;
    this.setCurrent(state === 'checked');
  }
}
