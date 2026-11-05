import { CheckableElement } from '../shared/checkable.js';
import { switchDef } from './switch.def.js';

export class NeuSwitch extends CheckableElement {
  static override def = switchDef;
  protected readonly anchor = 'track';

  constructor() {
    super();
    this.internals.role = 'switch';
  }

  protected paint(): void {
    this.ref('track')?.classList.toggle('on', this.checked);
  }
}
