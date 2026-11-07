import { dispatch, inSlotted, setText } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { requiredMessage } from '../../core/validation.js';
import { RESYNC, SET_CHECKED, SET_GROUP_DISABLED, type RadioLink } from '../radio/radio-link.js';
import { markRule, radioGroupDef } from './radio-group.def.js';

/** Which way each arrow key moves through the radios. */
const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/** A radio's value; without the attribute it is "on", like a native radio. */
const valueOf = (radio: Element) => radio.getAttribute('value') ?? 'on';

export class NeuRadioGroup extends FormControlElement {
  static override def = radioGroupDef;
  static override extraProperties = ['defaultValue'];
  declare name: string;
  declare label: string;
  declare required: boolean;
  declare disabled: boolean;
  declare orientation: 'vertical' | 'horizontal';
  /**
   * The requested value, kept even while no radio matches it (plan decision 8); null requests
   * nothing, so a radio whose value is "" is chosen only when asked for.
   */
  private current: string | null;
  private dirty = false;
  /** The radio that holds the Tab stop. */
  private stop: RadioLink | undefined;
  /** The selected radio as of the last sync, which the form value and validity read. */
  private picked: RadioLink | undefined;
  private observer: MutationObserver | undefined;

  constructor() {
    super();
    this.current = this.getAttribute('value');
    this.internals.role = 'radiogroup';
    this.addEventListener('click', (event) => {
      const radio = this.radioAt(event);
      if (radio && !this.isDisabled && !radio.hasAttribute('disabled')) this.choose(radio);
    });
    this.addEventListener('keydown', (event) => this.onKey(event));
  }

  get value(): string {
    return this.selected() ? this.current! : '';
  }
  set value(next: string) {
    this.dirty = true;
    this.current = next === null || next === undefined ? null : String(next);
    this.sync();
  }

  get defaultValue(): string {
    return String(this.props.value);
  }
  set defaultValue(next: string) {
    this.setAttribute('value', String(next));
  }

  /** The radios of this group: those whose closest group is this one. */
  private radios(): RadioLink[] {
    return [...this.querySelectorAll<RadioLink>('neu-radio')].filter(
      (radio) => radio.closest('neu-radio-group') === this,
    );
  }

  /** The first radio of this group matching the requested value, if one is requested. */
  private selected(radios = this.radios()): RadioLink | undefined {
    return this.current === null
      ? undefined
      : radios.find((radio) => valueOf(radio) === this.current);
  }

  private radioAt(event: Event): RadioLink | null {
    const radio =
      event.target instanceof Element ? event.target.closest<RadioLink>('neu-radio') : null;
    return radio && radio.closest('neu-radio-group') === this ? radio : null;
  }

  private onKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const radio = this.radioAt(event);
    // A key pressed inside a disabled radio (say, a link in its label) is not a choice.
    if (!radio || this.isDisabled || radio.hasAttribute('disabled')) return;
    if (event.key === ' ') {
      event.preventDefault();
      this.choose(radio);
      return;
    }
    let step = STEP[event.key];
    if (!step) return;
    // Like native radios, the horizontal arrows follow the reading direction.
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && this.matches(':dir(rtl)')) {
      step = -step;
    }
    const on = this.radios().filter((candidate) => !candidate.hasAttribute('disabled'));
    const next = on[(on.indexOf(radio) + step + on.length) % on.length];
    if (!next) return;
    event.preventDefault();
    next.focus();
    this.choose(next);
  }

  /** A choice by the user: no event when the value does not change. */
  private choose(radio: RadioLink): void {
    const next = valueOf(radio);
    if (next === this.current && this.selected()) return;
    this.dirty = true;
    this.current = next;
    this.sync();
    this.markInteracted();
    dispatch(this, 'input');
    dispatch(this, 'change');
  }

  [RESYNC](): void {
    this.sync();
  }

  /**
   * Brings every radio in line with the group: checked state, disabling, the one Tab stop (the
   * selected radio, else the first enabled one), the server-visible mark, and the form value.
   * Radios that are not upgraded yet are skipped; they ask for a resync when they connect.
   */
  private sync(): void {
    const radios = this.radios();
    const picked = (this.picked = this.selected(radios));
    const off = this.isDisabled;
    const ready = radios.filter((radio) => SET_CHECKED in radio);
    for (const radio of ready) {
      radio[SET_GROUP_DISABLED]!(off);
      radio[SET_CHECKED]!(radio === picked);
    }
    const on = off ? [] : ready.filter((radio) => !radio.disabled);
    this.stop = on.find((radio) => radio === picked) ?? on[0];
    for (const radio of on) {
      const tabindex = radio === this.stop ? '0' : '-1';
      if (radio.getAttribute('tabindex') !== tabindex) radio.setAttribute('tabindex', tabindex);
    }
    const rule = markRule(this.current ?? '');
    setText(this.ref('mark'), rule === '' ? '' : rule.value);
    this.commit();
  }

  /** The group's name: the slotted label's text when there is one, else the label attribute. */
  private nameGroup(): void {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="label"]');
    const text = (slot?.assignedNodes() ?? [])
      .map((node) => node.textContent)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    this.internals.ariaLabel = text || String(this.props.label) || null;
  }

  protected override rendered(): void {
    this.shadowRoot!.querySelector('slot[name="label"]')!.addEventListener('slotchange', () =>
      this.nameGroup(),
    );
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('value') && !this.dirty) this.current = this.getAttribute('value');
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('label')) {
      setText(this.ref('label-text'), String(this.props.label));
      this.nameGroup();
    }
    if (changed.has('required')) this.internals.ariaRequired = this.props.required ? 'true' : null;
    if (changed.has('disabled')) this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
    if (changed.has('value') || changed.has('required') || changed.has('disabled')) this.sync();
  }

  protected override connected(): void {
    // Radios coming, going or changing value or disabled resync the group. Frameworks rewrite the
    // slotted label's text in place, which fires no slotchange; that renames the group only.
    this.observer ??= new MutationObserver((records) => {
      const label = records.filter((record) => inSlotted(this, record.target));
      if (label.length) this.nameGroup();
      if (records.some((r) => r.type !== 'characterData' && !label.includes(r))) this.sync();
    });
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled', 'value'],
    });
    // The label may have changed while the group was detached and nothing was observing.
    this.nameGroup();
    this.sync();
  }

  protected override disconnected(): void {
    this.observer?.disconnect();
  }

  protected formValue(): string | null {
    return this.picked ? this.current : null;
  }
  /** Nothing selected saves nothing, so a radio whose value is "" is not chosen on restore. */
  protected override formState(): string | null {
    return this.formValue();
  }
  protected validate(): void {
    if (this.props.required === true && !this.picked) {
      this.internals.setValidity(
        { valueMissing: true },
        requiredMessage('radio', 'Please select one of these options.'),
        this.stop,
      );
    } else {
      this.internals.setValidity({});
    }
  }
  protected resetToDefault(): void {
    this.dirty = false;
    this.current = this.getAttribute('value');
    this.sync();
  }
  protected restoreState(state: string): void {
    this.dirty = true;
    this.current = state;
    this.sync();
  }
}
