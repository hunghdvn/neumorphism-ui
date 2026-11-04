import { NeuButton } from '../button/button.js';
import { renderIconInto } from '../icon/icon-loader.js';
import { onIconLibraryChange } from '../icon/icon-registry.js';
import { iconButtonDef } from './icon-button.def.js';

export class NeuIconButton extends NeuButton {
  static override def = iconButtonDef;
  declare icon: string;
  declare library: string;
  declare label: string;
  declare shape: 'circle' | 'square';
  private unsubscribe: (() => void) | undefined;
  private wasRemoved = false;

  private draw(): void {
    const box = this.ref('icon');
    if (box) renderIconInto(box, String(this.props.library), String(this.props.icon));
  }

  protected override update(changed: ReadonlySet<string>): void {
    super.update(changed);
    if (changed.has('label') || changed.has('icon')) {
      this.internals.ariaLabel = String(this.props.label || this.props.icon) || null;
    }
    if (changed.has('icon') || changed.has('library')) this.draw();
  }

  protected override connected(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = onIconLibraryChange((library) => {
      if (library === this.props.library) this.draw();
    });
    // Back in the page after a removal: a library may have changed meanwhile.
    if (this.wasRemoved) this.draw();
  }

  protected override disconnected(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.wasRemoved = true;
  }
}
