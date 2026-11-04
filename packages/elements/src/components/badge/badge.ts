import { NeuElement } from '../../core/neu-element.js';
import { badgeDef } from './badge.def.js';

export class NeuBadge extends NeuElement {
  static override def = badgeDef;
  declare variant: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  declare pill: boolean;
}
