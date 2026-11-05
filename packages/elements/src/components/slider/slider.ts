import { dispatch } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { sliderBigStep, sliderDef, sliderStyle, sliderUnit, sliderValue } from './slider.def.js';

export class NeuSlider extends FormControlElement {
  static override def = sliderDef;
  static override extraProperties = ['defaultValue', 'valueFormatter'];
  declare name: string;
  declare label: string;
  declare min: number;
  declare max: number;
  declare step: number;
  declare disabled: boolean;
  private current: number;
  private dirty = false;
  private dragging = false;
  private startValue = 0;
  private formatter: ((value: number) => string) | undefined;

  constructor() {
    super();
    this.internals.role = 'slider';
    this.internals.ariaOrientation = 'horizontal';
    this.current = this.snap(this.props.value as number);
    this.addEventListener('keydown', (event) => this.onKey(event));
    this.addEventListener('pointerdown', (event) => this.onDown(event));
    this.addEventListener('pointermove', (event) => this.onMove(event));
    this.addEventListener('pointerup', () => this.endDrag());
    this.addEventListener('pointercancel', () => this.endDrag());
  }

  get value(): number {
    return this.current;
  }
  set value(next: number) {
    this.dirty = true;
    this.setCurrent(this.snap(Number(next)));
  }

  get defaultValue(): number {
    return this.snap(this.props.value as number);
  }
  set defaultValue(next: number) {
    this.setAttribute('value', String(next));
  }

  get valueFormatter(): ((value: number) => string) | undefined {
    return this.formatter;
  }
  set valueFormatter(next: ((value: number) => string) | undefined) {
    this.formatter = typeof next === 'function' ? next : undefined;
    this.sync();
  }

  private snap(raw: number): number {
    return sliderValue(
      raw,
      this.props.min as number,
      this.props.max as number,
      this.props.step as number,
    );
  }

  /** Pushes the value to ARIA and the thumb, without touching the form. */
  private sync(): void {
    const { min, max } = this.props as { min: number; max: number };
    const internals = this.internals;
    internals.ariaLabel = this.props.label === '' ? null : String(this.props.label);
    internals.ariaValueMin = String(min);
    internals.ariaValueMax = String(Math.max(min, max));
    internals.ariaValueNow = String(this.current);
    internals.ariaValueText = this.formatter ? this.formatter(this.current) : null;
    // The template writes the same string, so a server-rendered root is left alone.
    const base = this.ref('base');
    const style = sliderStyle(this.current, min, max);
    if (base && base.getAttribute('style') !== style) base.setAttribute('style', style);
  }

  private setCurrent(next: number): void {
    this.current = next;
    this.sync();
    this.commit();
  }

  /** The value as a user change: marks the form interaction and fires input. Returns false if nothing changed. */
  private userSet(next: number): boolean {
    if (next === this.current) return false;
    this.markInteracted();
    this.setCurrent(next);
    dispatch(this, 'input');
    return true;
  }

  private onKey(event: KeyboardEvent): void {
    if (this.isDisabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const { min, max } = this.props as { min: number; max: number };
    const step = sliderUnit(this.props.step as number);
    const direction = this.matches(':dir(rtl)') ? -1 : 1;
    const big = sliderBigStep(min, max, step);
    const wanted: Record<string, number> = {
      ArrowRight: this.current + step * direction,
      ArrowLeft: this.current - step * direction,
      ArrowUp: this.current + step,
      ArrowDown: this.current - step,
      PageUp: this.current + big,
      PageDown: this.current - big,
      Home: Number.NEGATIVE_INFINITY,
      End: Number.POSITIVE_INFINITY,
    };
    const raw = wanted[event.key];
    if (raw === undefined) return;
    event.preventDefault();
    if (this.userSet(this.snap(raw))) dispatch(this, 'change');
  }

  private onDown(event: PointerEvent): void {
    if (this.isDisabled || event.button !== 0) return;
    this.dragging = true;
    this.startValue = this.current;
    this.focus();
    try {
      this.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser does not know (synthetic events): the drag is tracked by the flag.
    }
    this.moveTo(event);
  }

  private onMove(event: PointerEvent): void {
    if (this.dragging) this.moveTo(event);
  }

  private moveTo(event: PointerEvent): void {
    const track = this.ref('track');
    if (!track) return;
    const rect = track.getBoundingClientRect();
    let fraction = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    if (this.matches(':dir(rtl)')) fraction = 1 - fraction;
    const { min, max } = this.props as { min: number; max: number };
    const clamped = Math.min(1, Math.max(0, fraction));
    this.userSet(this.snap(min + clamped * (Math.max(min, max) - min)));
  }

  private endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.current !== this.startValue) dispatch(this, 'change');
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('value') || changed.has('min') || changed.has('max') || changed.has('step')) {
      // Until the user or a script sets one, the value is the attribute's; a new range re-snaps it.
      this.current = this.snap(this.dirty ? this.current : (this.props.value as number));
    }
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('disabled')) this.syncDisabledState();
    this.sync();
    this.commit();
  }

  protected formValue(): string {
    return String(this.current);
  }
  protected validate(): void {
    this.internals.setValidity({});
  }
  protected resetToDefault(): void {
    this.dirty = false;
    this.setCurrent(this.snap(this.props.value as number));
  }
  protected restoreState(state: string): void {
    this.dirty = true;
    this.setCurrent(this.snap(Number(state)));
  }
}
