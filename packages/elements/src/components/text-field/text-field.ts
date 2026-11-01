import { afterDispatch, dispatch, setOptionalAttribute, setText } from '../../core/dom.js';
import { FormControlElement, implicitSubmit } from '../../core/form-control.js';
import { copyValidity } from '../../core/validation.js';
import { textFieldDef, type TextFieldProps } from './text-field.def.js';

export class NeuTextField extends FormControlElement {
  static override def = textFieldDef;
  static override extraProperties = ['defaultValue'];
  declare type: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  declare name: string;
  declare label: string;
  declare placeholder: string;
  declare helpText: string;
  declare errorText: string;
  declare required: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare minLength: number;
  declare maxLength: number;
  declare pattern: string;
  declare autocomplete: string;
  declare size: 'sm' | 'md' | 'lg';
  // inputMode and enterKeyHint are inherited from HTMLElement with the right type.
  /** True once the value was edited or set as a property; the default then stops applying. */
  private dirty = false;
  /** A value set before the shadow root exists. */
  private pendingValue: string | null = null;

  get value(): string {
    return this.input?.value ?? this.pendingValue ?? this.p.value;
  }
  set value(next: string) {
    const text = next === null || next === undefined ? '' : String(next);
    this.dirty = true;
    const input = this.input;
    if (input) input.value = text;
    else this.pendingValue = text;
    this.commit();
  }

  get defaultValue(): string {
    return this.p.value;
  }
  set defaultValue(next: string) {
    this.setAttribute('value', String(next));
  }

  /** Focuses the inner input directly, so the caret stays where it was (no select-all). */
  override focus(options?: FocusOptions): void {
    const input = this.input;
    if (input) input.focus(options);
    else super.focus(options);
  }

  select(): void {
    this.input?.select();
  }

  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none'): void {
    this.input?.setSelectionRange(start, end, direction);
  }

  private get p(): TextFieldProps {
    return this.props as TextFieldProps;
  }

  private get input(): HTMLInputElement | null {
    return this.ref<HTMLInputElement>('input');
  }

  protected override rendered(): void {
    const input = this.input!;
    // An SSR'd input works before JS loads; keep whatever was typed or autofilled meanwhile.
    if (input.value !== this.p.value) this.dirty = true;
    if (this.pendingValue !== null) {
      input.value = this.pendingValue;
      this.pendingValue = null;
    }
    input.addEventListener('input', () => {
      this.dirty = true;
      this.commit();
    });
    input.addEventListener('change', () => {
      this.markInteracted();
      dispatch(this, 'change');
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      // Like a native input: submit once the keydown has finished dispatching, unless a listener
      // (on the host or further up) cancelled it.
      afterDispatch(event, () => {
        if (!event.defaultPrevented) implicitSubmit(this.internals.form);
      });
    });
  }

  protected override update(changed: ReadonlySet<string>): void {
    const p = this.p;
    const input = this.input;
    if (input) {
      if (changed.has('type') && input.type !== p.type) input.type = p.type;
      if (changed.has('value')) {
        if (input.defaultValue !== p.value) input.defaultValue = p.value;
        if (!this.dirty) input.value = p.value;
      }
      if (changed.has('placeholder')) setOptionalAttribute(input, 'placeholder', p.placeholder);
      if (changed.has('required')) input.required = p.required;
      if (changed.has('disabled')) input.disabled = this.isDisabled;
      if (changed.has('readOnly')) input.readOnly = p.readOnly;
      if (changed.has('minLength')) {
        setOptionalAttribute(input, 'minlength', p.minLength >= 0 ? String(p.minLength) : '');
      }
      if (changed.has('maxLength')) {
        setOptionalAttribute(input, 'maxlength', p.maxLength >= 0 ? String(p.maxLength) : '');
      }
      if (changed.has('pattern')) setOptionalAttribute(input, 'pattern', p.pattern);
      if (changed.has('autocomplete')) setOptionalAttribute(input, 'autocomplete', p.autocomplete);
      if (changed.has('inputMode')) setOptionalAttribute(input, 'inputmode', p.inputMode);
      if (changed.has('enterKeyHint')) setOptionalAttribute(input, 'enterkeyhint', p.enterKeyHint);
    }
    if (changed.has('label')) setText(this.ref('label-text'), p.label);
    if (changed.has('helpText')) setText(this.ref('help-text'), p.helpText);
    this.commit();
  }

  protected formValue(): string {
    return this.value;
  }

  protected validate(): void {
    const input = this.input;
    if (!input || input.validity.valid) this.internals.setValidity({});
    else this.internals.setValidity(copyValidity(input.validity), input.validationMessage, input);
    setText(this.ref('error-text'), this.p.errorText || input?.validationMessage || '');
  }

  protected resetToDefault(): void {
    this.dirty = false;
    this.pendingValue = null;
    const input = this.input;
    if (input) input.value = this.p.value;
  }

  protected restoreState(state: string): void {
    this.dirty = true;
    const input = this.input;
    if (input) input.value = state;
    else this.pendingValue = state;
  }
}
