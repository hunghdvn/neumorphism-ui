import { dispatch } from '../../core/dom.js';
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
    this.addEventListener('keyup', (event) => {
      if (event.key === ' ') this.click();
    });
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
   * Native checkbox order: flip now, let click listeners see it, then input + change.
   * A macrotask, not a microtask: for a real (trusted) click the microtask queue drains
   * between listeners, which would fire input/change before later click listeners ran.
   */
  private onClick(event: Event): void {
    const before = this.current;
    this.dirty = true;
    this.setCurrent(!before);
    setTimeout(() => {
      if (event.defaultPrevented) {
        this.setCurrent(before);
        return;
      }
      this.markInteracted();
      dispatch(this, 'input');
      dispatch(this, 'change');
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.click();
    }
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
    if (changed.has('disabled')) {
      this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
      this.syncFocusable(!this.isDisabled);
    }
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
