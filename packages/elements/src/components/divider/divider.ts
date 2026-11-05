import { NeuElement } from '../../core/neu-element.js';
import { dividerDef } from './divider.def.js';

export class NeuDivider extends NeuElement {
  static override def = dividerDef;
  declare orientation: 'horizontal' | 'vertical';

  constructor() {
    super();
    this.internals.role = 'separator';
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('orientation')) this.internals.ariaOrientation = this.orientation;
  }
}
