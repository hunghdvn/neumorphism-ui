import { NeuElement } from '../../core/neu-element.js';
import { buttonGroupDef } from './button-group.def.js';

export class NeuButtonGroup extends NeuElement {
  static override def = buttonGroupDef;
  declare label: string;
  declare orientation: 'horizontal' | 'vertical';

  constructor() {
    super();
    this.internals.role = 'group';
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('label')) this.internals.ariaLabel = String(this.props.label) || null;
  }
}
