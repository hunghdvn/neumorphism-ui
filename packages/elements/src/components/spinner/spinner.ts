import { NeuElement } from '../../core/neu-element.js';
import { spinnerDef } from './spinner.def.js';

export class NeuSpinner extends NeuElement {
  static override def = spinnerDef;
  declare label: string;
  declare size: 'sm' | 'md' | 'lg';

  constructor() {
    super();
    this.internals.role = 'status';
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('label')) this.internals.ariaLabel = String(this.props.label) || null;
  }
}
