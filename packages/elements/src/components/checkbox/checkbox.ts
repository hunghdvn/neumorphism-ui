import { CheckableElement } from '../shared/checkable.js';
import { checkboxDef } from './checkbox.def.js';

export class NeuCheckbox extends CheckableElement {
  static override def = checkboxDef;
  /** Only Space toggles, like a native checkbox. */
  static override enter = 'none' as const;
  declare indeterminate: boolean;
  protected readonly anchor = 'control';

  constructor() {
    super();
    this.internals.role = 'checkbox';
  }

  protected override ariaCheckedValue(): 'true' | 'false' | 'mixed' {
    return this.props.indeterminate === true ? 'mixed' : super.ariaCheckedValue();
  }

  /** Native: clicking an indeterminate box checks it and clears indeterminate. */
  protected override flip(): () => void {
    const mixed = this.props.indeterminate === true;
    if (!mixed) return super.flip();
    const checked = this.checked;
    this.setProp('indeterminate', false);
    this.checked = true;
    return () => {
      this.setProp('indeterminate', true);
      this.checked = checked;
    };
  }

  protected paint(): void {
    const mixed = this.props.indeterminate === true;
    const control = this.ref('control');
    control?.classList.toggle('on', this.checked);
    control?.classList.toggle('mixed', mixed);
    this.toggleState('indeterminate', mixed);
  }

  protected override update(changed: ReadonlySet<string>): void {
    super.update(changed);
    if (changed.has('indeterminate')) this.sync();
  }
}
