import { NeuElement } from '../../core/neu-element.js';
import { optionDef } from './option.def.js';
import { optionLabel, readOption } from './option-data.js';

export class NeuOption extends NeuElement {
  static override def = optionDef;
  declare disabled: boolean;

  /** The value attribute, or the label when there is none (like a native option). */
  get value(): string {
    return readOption(this).value;
  }
  set value(next: string) {
    this.setAttribute('value', next === null || next === undefined ? '' : String(next));
  }

  /** The text content, whitespace collapsed. */
  get label(): string {
    return optionLabel(this.textContent ?? '');
  }
}
