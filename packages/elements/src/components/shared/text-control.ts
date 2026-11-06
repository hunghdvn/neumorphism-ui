import { dispatch, setOptionalAttribute, setText } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { copyValidity } from '../../core/validation.js';

type TextControl = HTMLInputElement | HTMLTextAreaElement;

/** The props every text control shares; a subclass's def may leave some out. */
interface TextControlProps {
  value: string;
  placeholder: string;
  required: boolean;
  readOnly: boolean;
  minLength: number;
  maxLength: number;
  autocomplete: string;
  errorText: string;
  label: string;
  helpText: string;
  enterKeyHint: string;
}

/** The props that can change the form value, its restore state or its validity in every text control. */
export const baseCommitProps = [
  'value',
  'required',
  'disabled',
  'readOnly',
  'minLength',
  'maxLength',
  'errorText',
  'autocomplete',
] as const;

function autocompleteOff(value: string | null | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'off';
}

/**
 * The behaviour text-field, textarea and number-field share: a native control in the shadow root
 * (`data-ref="input"`) holds the value, and the host mirrors its form value, restore state and
 * validity. update() touches a prop only when it is in `changed`, so props a def does not declare
 * never reach it.
 */
export abstract class TextControlElement extends FormControlElement {
  declare name: string;
  declare label: string;
  declare placeholder: string;
  declare helpText: string;
  declare errorText: string;
  declare required: boolean;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare autocomplete: string;
  /** True once the value was edited or set as a property; the default then stops applying. */
  protected dirty = false;
  /** A value set before the shadow root exists. */
  protected pendingValue: string | null = null;

  /** Props that can change the form value, its restore state or its validity. */
  protected abstract readonly commitProps: readonly string[];
  /** A detached control holding `value`, sanitized and constrained the way the real one is. */
  protected abstract probe(value: string): TextControl;

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

  /** Focuses the inner control directly, so the caret stays where it was (no select-all). */
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

  protected get p(): TextControlProps {
    return this.props as unknown as TextControlProps;
  }

  protected get input(): TextControl | null {
    return this.ref<TextControl>('input');
  }

  /** Hook for keys pressed in the inner control. */
  protected controlKeyDown(_event: KeyboardEvent): void {}

  private needsCommit(changed: ReadonlySet<string>): boolean {
    return this.commitProps.some((key) => changed.has(key));
  }

  /** Stands in for the inner control until it exists, so validity is right from the start. */
  private validityProbe(): TextControl {
    const p = this.p;
    const probe = this.probe(this.value);
    probe.required = p.required;
    probe.readOnly = p.readOnly;
    probe.disabled = this.isDisabled;
    if (p.minLength >= 0) probe.setAttribute('minlength', String(p.minLength));
    if (p.maxLength >= 0) probe.setAttribute('maxlength', String(p.maxLength));
    return probe;
  }

  protected override rendered(): void {
    const input = this.input;
    // A declarative root adopted without its control (cut short by the parser): nothing to wire up.
    if (!input) return;
    // An SSR'd control works before JS loads; keep whatever was typed or autofilled meanwhile.
    // Compare with the sanitized default: the browser trims or strips some values by itself.
    if (input.value !== this.probe(this.p.value).value) this.dirty = true;
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
    input.addEventListener('keydown', (event) => this.controlKeyDown(event as KeyboardEvent));
  }

  protected override update(changed: ReadonlySet<string>): void {
    const p = this.p;
    const input = this.input;
    if (input) {
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
      if (changed.has('autocomplete')) setOptionalAttribute(input, 'autocomplete', p.autocomplete);
      if (changed.has('enterKeyHint')) setOptionalAttribute(input, 'enterkeyhint', p.enterKeyHint);
    }
    if (changed.has('label')) setText(this.ref('label-text'), p.label);
    if (changed.has('helpText')) setText(this.ref('help-text'), p.helpText);
    if (this.needsCommit(changed)) this.commit();
  }

  /** update() only runs once connected; before that, keep the value and validity current here. */
  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (!this.isConnected && !this.input && this.needsCommit(changed)) this.commit();
  }

  protected formValue(): string {
    return this.value;
  }

  /**
   * Like a native control, one with autocomplete=off is never saved for restore, nor is one
   * that sets none of its own inside a form with autocomplete=off.
   */
  protected override formState(): string | null {
    const own = this.p.autocomplete?.trim();
    const off = own
      ? autocompleteOff(own)
      : autocompleteOff(this.internals.form?.getAttribute('autocomplete'));
    return off ? null : this.value;
  }

  protected validate(): void {
    const input = this.input;
    const source = input ?? this.validityProbe();
    // A disabled or readonly control still sets flags such as typeMismatch, but is barred from
    // validation and has no message; setValidity() would throw on flags without a message.
    if (!source.willValidate || source.validity.valid) this.internals.setValidity({});
    else {
      this.internals.setValidity(
        copyValidity(source.validity),
        source.validationMessage,
        input ?? undefined,
      );
    }
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
