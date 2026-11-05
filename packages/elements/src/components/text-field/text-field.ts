import { afterDispatch, setOptionalAttribute } from '../../core/dom.js';
import { TextControlElement } from '../shared/text-control.js';
import { implicitSubmit } from './implicit-submit.js';
import { textFieldDef, type TextFieldProps } from './text-field.def.js';

export class NeuTextField extends TextControlElement {
  static override def = textFieldDef;
  static override extraProperties = ['defaultValue'];
  declare type: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  declare minLength: number;
  declare maxLength: number;
  declare pattern: string;
  declare size: 'sm' | 'md' | 'lg';
  // inputMode and enterKeyHint are inherited from HTMLElement with the right type.

  protected readonly commitProps = [
    'value',
    'type',
    'required',
    'disabled',
    'readOnly',
    'minLength',
    'maxLength',
    'pattern',
    'errorText',
    'autocomplete',
  ];

  private get tp(): TextFieldProps {
    return this.props as TextFieldProps;
  }

  /** A detached input of this type holding `value`, sanitized the way the browser does it. */
  protected probe(value: string): HTMLInputElement {
    const probe = document.createElement('input');
    probe.type = this.tp.type;
    probe.value = value;
    if (this.tp.pattern) probe.setAttribute('pattern', this.tp.pattern);
    return probe;
  }

  protected override controlKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing) return;
    // Like a native input: submit once the keydown has finished dispatching, unless a listener
    // (on the host or further up) cancelled it.
    afterDispatch(event, () => {
      if (!event.defaultPrevented) implicitSubmit(this.internals.form);
    });
  }

  protected override update(changed: ReadonlySet<string>): void {
    const p = this.tp;
    const input = this.input as HTMLInputElement | null;
    if (input) {
      if (changed.has('type') && input.type !== p.type) input.type = p.type;
      if (changed.has('pattern')) setOptionalAttribute(input, 'pattern', p.pattern);
      if (changed.has('inputMode')) setOptionalAttribute(input, 'inputmode', p.inputMode);
    }
    super.update(changed);
  }

  /** Like a native input, a password field is never saved for restore. */
  protected override formState(): string | null {
    return this.tp.type === 'password' ? null : super.formState();
  }
}
