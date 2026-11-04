import { NeuElement } from '../../core/neu-element.js';
import { surfaceDef } from './surface.def.js';

export class NeuSurface extends NeuElement {
  static override def = surfaceDef;
  declare shape: 'raised' | 'inset' | 'flat' | 'convex' | 'concave';
  declare elevation: 'sm' | 'md' | 'lg';
  declare radius: 'sm' | 'md' | 'lg' | 'full';
  declare padding: 'none' | 'sm' | 'md' | 'lg';
}
