import { afterDispatch, dispatch } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { requiredCheckboxMessage } from '../../core/validation.js';
import { pressable, type EnterMode } from './press.js';

/**
 * Base for controls with a checked state (switch, checkbox): the checked/default split, the native
 * click order, form value, required validity, reset and restore. Subclasses paint their own shadow.
 */
export abstract class CheckableElement extends FormControlElement {
  static override extraProperties = ['defaultChecked'];
  /** How Enter activates; Space always does. */
  static enter: EnterMode = 'once';
  declare name: string;
  declare value: string;
  declare disabled: boolean;
  declare required: boolean;
  declare size: 'sm' | 'md' | 'lg';
  private current: boolean;
  private dirty = false;

  /** data-ref of the node that anchors validity messages. */
  protected abstract readonly anchor: string;
  /** Mirrors the current state into the shadow root's classes. */
  protected abstract paint(): void;

  constructor() {
    super();
    this.current = this.props.checked === true;
    this.addEventListener('click', (event) => this.onClick(event));
    // Like a native checkbox, Space toggles on keyup only after its own keydown.
    pressable(
      this,
      this.internals.states,
      (this.constructor as typeof CheckableElement).enter,
      () => this.isDisabled,
    );
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

  protected ariaCheckedValue(): 'true' | 'false' | 'mixed' {
    return this.current ? 'true' : 'false';
  }

  /** Changes the state for a click and returns the function that puts it back. */
  protected flip(): () => void {
    const before = this.current;
    this.setCurrent(!before);
    return () => this.setCurrent(before);
  }

  /**
   * Native checkbox order: flip now, let click listeners see it, then input + change once the
   * click has finished dispatching (within it, unless propagation was stopped before window).
   */
  private onClick(event: Event): void {
    this.dirty = true;
    const undo = this.flip();
    const flipped = this.ariaCheckedValue();
    afterDispatch(event, () => {
      if (event.defaultPrevented) {
        undo();
      } else if (this.isConnected && this.ariaCheckedValue() === flipped) {
        this.markInteracted();
        dispatch(this, 'input');
        dispatch(this, 'change');
      }
    });
  }

  /** Pushes the state to host state, ARIA and the shadow root, without touching the form. */
  protected sync(): void {
    this.toggleState('checked', this.current);
    this.internals.ariaChecked = this.ariaCheckedValue();
    this.paint();
  }

  private setCurrent(value: boolean): void {
    this.current = value;
    this.sync();
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
        this.ref(this.anchor) ?? undefined,
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
