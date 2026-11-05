import { NeuButton } from '../button/button.js';
import { iconDrawer } from '../icon/icon-drawer.js';
import { iconButtonDef } from './icon-button.def.js';

export class NeuIconButton extends NeuButton {
  static override def = iconButtonDef;
  declare icon: string;
  declare library: string;
  declare label: string;
  declare shape: 'circle' | 'square';
  private readonly drawer = iconDrawer(
    () => this.ref('icon'),
    () => String(this.props.library),
    () => String(this.props.icon),
  );

  protected override update(changed: ReadonlySet<string>): void {
    super.update(changed);
    if (changed.has('label') || changed.has('icon')) {
      this.internals.ariaLabel = String(this.props.label || this.props.icon) || null;
    }
    if (changed.has('icon') || changed.has('library')) this.drawer.draw();
  }

  protected override connected(): void {
    this.drawer.connected();
  }

  protected override disconnected(): void {
    this.drawer.disconnected();
  }
}
