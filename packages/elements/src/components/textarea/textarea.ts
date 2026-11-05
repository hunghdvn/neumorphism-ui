import { baseCommitProps, TextControlElement } from '../shared/text-control.js';
import { rowsOf, textareaDef, type TextareaProps } from './textarea.def.js';

export class NeuTextarea extends TextControlElement {
  static override def = textareaDef;
  static override extraProperties = ['defaultValue'];
  declare minLength: number;
  declare maxLength: number;
  declare rows: number;
  declare resize: 'none' | 'vertical' | 'auto';
  declare size: 'sm' | 'md' | 'lg';
  // enterKeyHint is inherited from HTMLElement with the right type.

  protected readonly commitProps = baseCommitProps;

  private get tp(): TextareaProps {
    return this.props as TextareaProps;
  }

  // An accessor override must redefine both halves; a script-set value needs a fresh height.
  override get value(): string {
    return super.value;
  }
  override set value(next: string) {
    super.value = next;
    this.grow();
  }

  protected probe(value: string): HTMLTextAreaElement {
    const probe = document.createElement('textarea');
    probe.value = value;
    return probe;
  }

  private sizeWatch: ResizeObserver | undefined;
  private lastWidth = -1;

  /**
   * Re-fits when the width changes or the box first gets a layout (it was hidden, or server
   * rendered); its own height changes keep the width, so they do not loop.
   */
  private watchSize(area: HTMLTextAreaElement, on: boolean): void {
    if (!on) {
      this.sizeWatch?.disconnect();
      this.sizeWatch = undefined;
      return;
    }
    if (this.sizeWatch) return;
    this.lastWidth = -1;
    this.sizeWatch = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === this.lastWidth) return;
      this.lastWidth = width;
      this.grow();
    });
    this.sizeWatch.observe(area);
  }

  /** resize="auto": fit the height to the content, never below the rows height. */
  private grow(): void {
    const area = this.input as HTMLTextAreaElement | null;
    if (!area) return;
    this.watchSize(area, this.isConnected && this.tp.resize === 'auto');
    if (this.tp.resize !== 'auto') {
      area.style.blockSize = '';
      return;
    }
    // Back to the rows height first: scrollHeight is never smaller than the box it sits in.
    area.style.blockSize = 'auto';
    const fit = area.scrollHeight;
    // Not laid out (disconnected or hidden): keep the rows height.
    if (fit) area.style.blockSize = `${fit}px`;
  }

  protected override connected(): void {
    super.connected();
    this.grow();
  }

  protected override disconnected(): void {
    super.disconnected();
    this.sizeWatch?.disconnect();
    this.sizeWatch = undefined;
  }

  protected override rendered(): void {
    super.rendered();
    this.input?.addEventListener('input', () => this.grow());
  }

  protected override update(changed: ReadonlySet<string>): void {
    const area = this.input as HTMLTextAreaElement | null;
    if (area && changed.has('rows')) area.rows = rowsOf(this.tp.rows);
    super.update(changed);
    if (['value', 'rows', 'resize', 'size'].some((key) => changed.has(key))) this.grow();
  }

  protected override resetToDefault(): void {
    super.resetToDefault();
    this.grow();
  }

  protected override restoreState(state: string): void {
    super.restoreState(state);
    this.grow();
  }
}
