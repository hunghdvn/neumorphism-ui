import { NeuElement } from '../../core/neu-element.js';
import { renderIconInto } from './icon-loader.js';
import { onIconLibraryChange } from './icon-registry.js';
import { iconDef } from './icon.def.js';

export class NeuIcon extends NeuElement {
  static override def = iconDef;
  declare name: string;
  declare library: string;
  declare label: string;
  private unsubscribe: (() => void) | undefined;

  private draw(): void {
    const box = this.ref('box');
    if (box) renderIconInto(box, String(this.props.library), String(this.props.name));
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('label')) {
      const label = String(this.props.label);
      this.internals.role = label ? 'img' : null;
      this.internals.ariaLabel = label || null;
      this.internals.ariaHidden = label ? null : 'true';
    }
    if (changed.has('name') || changed.has('library')) this.draw();
  }

  protected override connected(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = onIconLibraryChange((library) => {
      if (library === this.props.library) this.draw();
    });
    // Back in the page after a removal: a library may have changed meanwhile.
    this.draw();
  }

  protected override disconnected(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
