import { setText } from '../../core/dom.js';
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
    if (!changed.has('label')) return;
    const label = String(this.props.label);
    this.internals.ariaLabel = label || null;
    setText(this.ref('label'), label);
  }
}
