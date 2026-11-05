import { dispatch, setText } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { RESYNC, SET_CHECKED, SET_GROUP_DISABLED, type RadioLink } from '../radio/radio-link.js';
import { markRule, radioGroupDef } from './radio-group.def.js';

let radioMessage: string | undefined;

/** The browser's own, localised "please select one of these options" message, from a native radio. */
function requiredRadioMessage(): string {
  if (radioMessage === undefined) {
    const probe = document.createElement('input');
    probe.type = 'radio';
    probe.required = true;
    radioMessage = probe.validationMessage || 'Please select one of these options.';
  }
  return radioMessage;
}

/** Which way each arrow key moves through the radios. */
const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

const valueOf = (radio: Element) => radio.getAttribute('value') ?? '';

export class NeuRadioGroup extends FormControlElement {
  static override def = radioGroupDef;
  static override extraProperties = ['defaultValue'];
  declare name: string;
  declare label: string;
  declare required: boolean;
  declare disabled: boolean;
  declare orientation: 'vertical' | 'horizontal';
  /** The requested value, kept even while no radio matches it (plan decision 8). */
  private current: string;
  private dirty = false;
  /** The radio that holds the Tab stop. */
  private stop: RadioLink | undefined;
  private observer: MutationObserver | undefined;

  constructor() {
    super();
    this.current = String(this.props.value);
    this.internals.role = 'radiogroup';
    this.addEventListener('click', (event) => {
      const radio = this.radioAt(event);
      if (radio && !this.isDisabled && !radio.hasAttribute('disabled')) this.choose(radio);
    });
    this.addEventListener('keydown', (event) => this.onKey(event));
  }

  get value(): string {
    return this.selected() ? this.current : '';
  }
  set value(next: string) {
    this.dirty = true;
    this.current = next === null || next === undefined ? '' : String(next);
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

  /** The first radio of this group matching the current value; none for an empty value. */
  private selected(radios = this.radios()): RadioLink | undefined {
    return this.current === ''
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
    const step = STEP[event.key];
    if (!step) return;
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
    if (next === this.value) return;
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
    const picked = this.selected(radios);
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
    const rule = markRule(this.current);
    setText(this.ref('mark'), rule === '' ? '' : rule.value);
    this.commit();
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('value') && !this.dirty) this.current = String(this.props.value);
  }

  protected override update(changed: ReadonlySet<string>): void {
    if (changed.has('label')) {
      setText(this.ref('label'), String(this.props.label));
      this.internals.ariaLabel = String(this.props.label) || null;
    }
    if (changed.has('required')) this.internals.ariaRequired = this.props.required ? 'true' : null;
    if (changed.has('disabled')) this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
    if (changed.has('value') || changed.has('required') || changed.has('disabled')) this.sync();
  }

  protected override connected(): void {
    this.observer ??= new MutationObserver(() => this.sync());
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'value'],
    });
    this.sync();
  }

  protected override disconnected(): void {
    this.observer?.disconnect();
  }

  protected formValue(): string | null {
    return this.selected() ? this.current : null;
  }
  protected validate(): void {
    if (this.props.required === true && !this.selected()) {
      this.internals.setValidity({ valueMissing: true }, requiredRadioMessage(), this.stop);
    } else {
      this.internals.setValidity({});
    }
  }
  protected resetToDefault(): void {
    this.dirty = false;
    this.current = String(this.props.value);
    this.sync();
  }
  protected restoreState(state: string): void {
    this.dirty = true;
    this.current = state;
    this.sync();
  }
}
