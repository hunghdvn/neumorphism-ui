import { NeuElement } from '../../core/neu-element.js';
import { radioDef } from './radio.def.js';
import { RESYNC, SET_CHECKED, SET_GROUP_DISABLED } from './radio-link.js';

export { SET_CHECKED, SET_GROUP_DISABLED };

export class NeuRadio extends NeuElement {
  static override def = radioDef;
  declare value: string;
  declare disabled: boolean;
  private on = false;
  private groupOff = false;

  constructor() {
    super();
    this.internals.role = 'radio';
    this.internals.ariaChecked = 'false';
  }

  get checked(): boolean {
    return this.on;
  }

  [SET_CHECKED](on: boolean): void {
    this.on = on;
    this.toggleState('checked', on);
    this.internals.ariaChecked = on ? 'true' : 'false';
  }

  [SET_GROUP_DISABLED](off: boolean): void {
    if (off === this.groupOff) return;
    this.groupOff = off;
    this.syncDisabledState();
  }

  protected override get isDisabled(): boolean {
    return super.isDisabled || this.groupOff;
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled')) this.syncDisabledState();
  }

  protected override connected(): void {
    (this.closest('neu-radio-group') as { [RESYNC]?: () => void } | null)?.[RESYNC]?.();
  }

  /** Leaving a group (or the page) must not leave its selection or disabling behind. */
  protected override disconnected(): void {
    this[SET_CHECKED](false);
    this[SET_GROUP_DISABLED](false);
  }
}
