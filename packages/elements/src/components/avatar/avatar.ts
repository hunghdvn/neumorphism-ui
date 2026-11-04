import { NeuElement } from '../../core/neu-element.js';
import { avatarDef } from './avatar.def.js';

export class NeuAvatar extends NeuElement {
  static override def = avatarDef;
  declare src: string;
  declare label: string;
  declare initials: string;
  declare size: 'sm' | 'md' | 'lg';
  declare shape: 'circle' | 'rounded';
  private broken = false;

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('src')) this.setBroken(false);
  }

  protected override rendered(): void {
    const img = this.ref<HTMLImageElement>('image');
    if (!img) return;
    img.addEventListener('error', () => this.setBroken(true));
    // The error event may have fired before this element upgraded; it will not fire again.
    if (img.hasAttribute('src') && img.complete && img.naturalWidth === 0) this.broken = true;
    this.toggleState('image-error', this.broken);
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('label')) {
      // Like neu-icon: a picture is named by its label, otherwise it is decoration.
      const label = String(this.props.label);
      this.internals.role = label ? 'img' : null;
      this.internals.ariaLabel = label || null;
      this.internals.ariaHidden = label ? null : 'true';
    }
    const img = this.ref<HTMLImageElement>('image');
    if (!img) return;
    const src = String(this.props.src);
    if (changed.has('src') && (img.getAttribute('src') ?? '') !== src) {
      if (src) img.setAttribute('src', src);
      else img.removeAttribute('src');
    }
    const base = this.ref('base')!;
    const show = this.showing();
    if (base.dataset.show !== show) base.dataset.show = show;
  }

  private showing(): string {
    return this.props.src && !this.broken ? 'image' : this.props.initials ? 'initials' : 'icon';
  }

  private setBroken(broken: boolean): void {
    if (this.broken === broken) return;
    this.broken = broken;
    this.toggleState('image-error', broken);
    if (this.ref('base')) this.update(new Set());
  }
}
