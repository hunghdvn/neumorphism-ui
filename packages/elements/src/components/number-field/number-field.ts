import { afterDispatch, composing, setOptionalAttribute } from '../../core/dom.js';
import { baseCommitProps, TextControlElement } from '../shared/text-control.js';
import { BLOCKS_IMPLICIT_SUBMIT, implicitSubmit } from '../text-field/implicit-submit.js';
import { stepUnit } from '../shared/step.js';
import { decimalPad, numberFieldDef, type NumberFieldProps } from './number-field.def.js';

type Mover = (input: HTMLInputElement) => void;

export class NeuNumberField extends TextControlElement {
  static override def = numberFieldDef;
  static readonly [BLOCKS_IMPLICIT_SUBMIT] = true;
  static override extraProperties = ['defaultValue', 'valueAsNumber'];
  declare min: number;
  declare max: number;
  declare step: number;
  declare size: 'sm' | 'md' | 'lg';
  declare incrementLabel: string;
  declare decrementLabel: string;

  protected readonly commitProps = [...baseCommitProps, 'min', 'max', 'step'];

  private get np(): NumberFieldProps {
    return this.props as NumberFieldProps;
  }

  get valueAsNumber(): number {
    const input = this.input as HTMLInputElement | null;
    return input ? input.valueAsNumber : this.probe(this.value).valueAsNumber;
  }
  set valueAsNumber(next: number) {
    this.value = Number.isFinite(next) ? String(next) : '';
  }

  /** The limits and step a native input of this field carries. */
  private constrain(input: HTMLInputElement): void {
    const p = this.np;
    setOptionalAttribute(input, 'min', Number.isFinite(p.min) ? String(p.min) : '');
    setOptionalAttribute(input, 'max', Number.isFinite(p.max) ? String(p.max) : '');
    input.step = String(stepUnit(p.step));
    setOptionalAttribute(input, 'inputmode', decimalPad(p.min) ? 'decimal' : '');
  }

  protected probe(value: string): HTMLInputElement {
    const probe = document.createElement('input');
    probe.type = 'number';
    this.constrain(probe);
    probe.value = value;
    return probe;
  }

  /** Moves the value, then reports it like a finished native edit: input (composed), then change. */
  private move(change: Mover): void {
    const input = this.input as HTMLInputElement | null;
    if (!input || input.disabled || input.readOnly) return;
    const before = input.value;
    try {
      change(input);
    } catch {
      // stepUp and stepDown throw when no step applies; the value stays as it was.
    }
    if (input.value === before) return;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  protected override rendered(): void {
    super.rendered();
    const steps: [string, Mover][] = [
      ['decrement', (input) => input.stepDown()],
      ['increment', (input) => input.stepUp()],
    ];
    for (const [ref, mover] of steps) {
      const button = this.ref<HTMLButtonElement>(ref);
      // Keep focus (and the caret) in the input while the button is pressed. A touch leaves focus
      // where it is: focusing the input would open the on-screen keyboard on every tap.
      button?.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (!button.disabled && event.pointerType !== 'touch') this.input?.focus();
      });
      button?.addEventListener('click', () => this.move(mover));
    }
  }

  protected override controlKeyDown(event: KeyboardEvent): void {
    if (composing(event)) return;
    if (event.key === 'Enter') {
      // Like a native input: submit once the keydown has finished dispatching, unless cancelled.
      afterDispatch(event, () => {
        if (!event.defaultPrevented) implicitSubmit(this.internals.form);
      });
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const { min, max } = this.np;
    let mover: Mover | undefined;
    if (event.key === 'PageUp') mover = (input) => input.stepUp(10);
    else if (event.key === 'PageDown') mover = (input) => input.stepDown(10);
    else if (event.key === 'Home' && Number.isFinite(min))
      mover = (input) => (input.value = `${min}`);
    else if (event.key === 'End' && Number.isFinite(max))
      mover = (input) => (input.value = `${max}`);
    if (!mover) return;
    event.preventDefault();
    this.move(mover);
  }

  protected override update(changed: ReadonlySet<string>): void {
    const input = this.input as HTMLInputElement | null;
    if (input) {
      if (['min', 'max', 'step'].some((key) => changed.has(key))) this.constrain(input);
      const off = this.isDisabled || this.np.readOnly;
      const buttons: [string, string][] = [
        ['decrement', 'decrementLabel'],
        ['increment', 'incrementLabel'],
      ];
      for (const [ref, label] of buttons) {
        const button = this.ref<HTMLButtonElement>(ref);
        if (!button) continue;
        if (changed.has('disabled') || changed.has('readOnly')) button.disabled = off;
        if (changed.has(label))
          button.setAttribute('aria-label', this.np[label as 'incrementLabel']);
      }
    }
    super.update(changed);
  }
}
