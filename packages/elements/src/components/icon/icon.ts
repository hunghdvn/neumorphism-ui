import { NeuElement } from '../../core/neu-element.js';
import { iconDrawer } from './icon-drawer.js';
import { iconDef } from './icon.def.js';

export class NeuIcon extends NeuElement {
  static override def = iconDef;
  declare name: string;
  declare library: string;
  declare label: string;
  private readonly drawer = iconDrawer(
    () => this.ref('box'),
    () => String(this.props.library),
    () => String(this.props.name),
  );

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('label')) {
      const label = String(this.props.label);
      this.internals.role = label ? 'img' : null;
      this.internals.ariaLabel = label || null;
      this.internals.ariaHidden = label ? null : 'true';
    }
    if (changed.has('name') || changed.has('library')) this.drawer.draw();
  }

  protected override connected(): void {
    this.drawer.connected();
  }

  protected override disconnected(): void {
    this.drawer.disconnected();
  }
}
