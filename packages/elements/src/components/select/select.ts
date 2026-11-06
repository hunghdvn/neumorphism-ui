import type { OptionData } from '../../core/define.js';
import { dispatch, setOptionalAttribute, setText } from '../../core/dom.js';
import { FormControlElement } from '../../core/form-control.js';
import { requiredMessage } from '../../core/validation.js';
import { readOption } from '../option/option-data.js';
import { pickOption, selectDef } from './select.def.js';

/** An option read from the light DOM, with the element it came from. */
interface Option extends OptionData {
  readonly source: Element;
}

/** Gap between the combobox and the listbox, in px. */
const GAP = 4;
/** How long typed characters keep adding to one typeahead search, in ms. */
const TYPEAHEAD_MS = 500;

export class NeuSelect extends FormControlElement {
  static override def = selectDef;
  static override extraProperties = ['defaultValue'];
  declare name: string;
  declare label: string;
  declare placeholder: string;
  declare helpText: string;
  declare errorText: string;
  declare required: boolean;
  declare disabled: boolean;
  declare size: 'sm' | 'md' | 'lg';
  /** The requested value, kept even while no option matches it (plan decision 8). */
  private current: string;
  private dirty = false;
  /** The options as last read, which the listbox mirrors by index (`option-<index>`). */
  private opts: Option[] = [];
  private observer: MutationObserver | undefined;
  private opened = false;
  /** The light-DOM option behind the active one, so a rebuild keeps it active. */
  private activeSource: Element | undefined;
  /** Whether the listbox was open when the pointer went down on the combobox. */
  private pressedOpen: boolean | undefined;
  private typed = '';
  private typedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.current = String(this.props.value);
  }

  get value(): string {
    return pickOption(this.read(), this.current) ? this.current : '';
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

  /** Reads the neu-option children from their attributes and text; they need not be upgraded. */
  private read(): Option[] {
    return [...this.querySelectorAll('neu-option')].map((el) => ({
      ...readOption(el),
      source: el,
    }));
  }

  /** The value as of the last read: the requested one while an option matches it, else ''. */
  private chosen(): string {
    return pickOption(this.opts, this.current) ? this.current : '';
  }

  /**
   * Reads the options again, then brings the display, an open listbox and the form in line.
   * setText writes only when the text differs, so a server-rendered display is left alone.
   */
  private sync(): void {
    this.opts = this.read();
    const picked = pickOption(this.opts, this.current);
    const display = this.ref('display');
    setText(display, picked ? picked.label : String(this.props.placeholder));
    display?.classList.toggle('placeholder', !picked);
    if (this.opened) this.render();
    this.commit();
  }

  /** The first enabled option from `from` going `dir`, `from` included; -1 when there is none. */
  private step(from: number, dir: number): number {
    for (let i = from; i >= 0 && i < this.opts.length; i += dir) {
      if (!this.opts[i]!.disabled) return i;
    }
    return -1;
  }

  /**
   * The enabled option nearest to `from` (clamped to the list) going `dir`, else turning back:
   * a move or jump past either end stops at the last enabled option that way.
   */
  private near(from: number, dir: number): number {
    const start = Math.min(Math.max(from, 0), this.opts.length - 1);
    const found = this.step(start, dir);
    return found < 0 ? this.step(start, -dir) : found;
  }

  private activeIndex(): number {
    return this.opts.findIndex((option) => option.source === this.activeSource);
  }

  /** Builds the listbox from the options and places it; the active option stays if it can. */
  private render(): void {
    const listbox = this.ref('listbox')!;
    const picked = pickOption(this.opts, this.current);
    listbox.replaceChildren(
      ...this.opts.map((option, i) => {
        const el = document.createElement('div');
        el.className = 'option';
        el.id = `option-${i}`;
        el.setAttribute('part', 'option');
        el.setAttribute('role', 'option');
        el.setAttribute('aria-selected', String(option === picked));
        if (option.disabled) el.setAttribute('aria-disabled', 'true');
        el.textContent = option.label;
        return el;
      }),
    );
    this.place();
    const kept = this.activeIndex();
    const selected = picked ? this.opts.indexOf(picked) : -1;
    this.activate(
      kept >= 0 && !this.opts[kept]!.disabled ? kept : selected >= 0 ? selected : this.step(0, 1),
    );
  }

  /** Makes option `i` the active one (none for -1) and scrolls it into view. */
  private activate(i: number): void {
    const listbox = this.ref('listbox')!;
    this.activeSource = this.opts[i]?.source;
    const items = [...listbox.children] as HTMLElement[];
    items.forEach((item, n) => item.classList.toggle('active', n === i));
    const item = items[i];
    setOptionalAttribute(this.ref('combobox'), 'aria-activedescendant', item ? item.id : '');
    if (!item) return;
    // Keep the listbox padding in view too, so Home and End scroll to the very top and bottom.
    const pad = items[0]!.offsetTop;
    const bottom = item.offsetTop + item.offsetHeight + pad;
    if (item.offsetTop - pad < listbox.scrollTop) listbox.scrollTop = item.offsetTop - pad;
    else if (bottom > listbox.scrollTop + listbox.clientHeight) {
      listbox.scrollTop = bottom - listbox.clientHeight;
    }
  }

  /** Puts the listbox under the combobox at its width, or above it when that has more room. */
  private readonly place = (): void => {
    const listbox = this.ref('listbox');
    const box = this.ref('combobox')?.getBoundingClientRect();
    if (!listbox || !box) return;
    listbox.style.left = `${box.left}px`;
    listbox.style.width = `${box.width}px`;
    const height = listbox.offsetHeight;
    const below = innerHeight - box.bottom - GAP;
    const above = box.top - GAP;
    const up = height > below && above > below;
    listbox.style.top = `${up ? box.top - GAP - height : box.bottom + GAP}px`;
  };

  private open(): void {
    const listbox = this.ref('listbox');
    if (this.opened || this.isDisabled || !listbox) return;
    this.opened = true;
    this.activeSource = undefined;
    if (!listbox.matches(':popover-open')) listbox.showPopover();
    this.render();
    this.ref('combobox')!.setAttribute('aria-expanded', 'true');
    window.addEventListener('scroll', this.place, { capture: true, passive: true });
    window.addEventListener('resize', this.place, { passive: true });
    this.ownerDocument.addEventListener('focusin', this.focusLanded, true);
    dispatch(this, 'neu-open');
  }

  /**
   * Focus that lands outside the select while the listbox is open. The combobox's focusout
   * covers most moves; this covers focus set elsewhere after the window was left (the focusout
   * then kept the listbox open, and Firefox sends no second one).
   */
  private readonly focusLanded = (): void => {
    if (!this.shadowRoot!.activeElement) this.close();
  };

  /** The one way the listbox closes: by key, by choice, by light dismiss (toggle), by focus leaving or when disabled. */
  private close(): void {
    if (!this.opened) return;
    this.opened = false;
    const listbox = this.ref('listbox')!;
    if (listbox.matches(':popover-open')) listbox.hidePopover();
    const combobox = this.ref('combobox')!;
    combobox.setAttribute('aria-expanded', 'false');
    combobox.removeAttribute('aria-activedescendant');
    window.removeEventListener('scroll', this.place, { capture: true });
    window.removeEventListener('resize', this.place);
    this.ownerDocument.removeEventListener('focusin', this.focusLanded, true);
    dispatch(this, 'neu-close');
  }

  /** A choice by the user: enabled options only, and events only when the value changes. */
  private choose(i: number): void {
    const option = this.opts[i];
    if (!option || option.disabled) return;
    const before = this.chosen();
    this.dirty = true;
    this.current = option.value;
    this.sync();
    if (option.value === before) return;
    this.markInteracted();
    dispatch(this, 'input');
    dispatch(this, 'change');
  }

  /**
   * Jumps to the next option whose label starts with the characters typed within TYPEAHEAD_MS.
   * A buffer of one letter (typed once or repeated) searches that letter from the option after
   * the active one, so repeating it cycles; any other buffer refines the search and starts at the
   * active option, which may still match.
   */
  private typeahead(char: string): void {
    clearTimeout(this.typedTimer);
    this.typedTimer = setTimeout(() => (this.typed = ''), TYPEAHEAD_MS);
    const typed = (this.typed += char.toLowerCase());
    const active = this.activeIndex();
    const count = this.opts.length;
    const find = (prefix: string, from: number): number => {
      for (let k = 0; k < count; k++) {
        const i = (from + k) % count;
        const option = this.opts[i]!;
        if (!option.disabled && option.label.toLowerCase().startsWith(prefix)) return i;
      }
      return -1;
    };
    // Ruling R-8: one letter, typed once or repeated, moves on from the active option, so labels
    // that start with a doubled letter ("AA Battery") cannot hold the cycle.
    const found = [...typed].every((c) => c === typed[0])
      ? find(typed[0]!, active + 1)
      : find(typed, Math.max(active, 0));
    if (found >= 0) this.activate(found);
  }

  private onKey(event: KeyboardEvent): void {
    if (this.isDisabled || event.ctrlKey || event.metaKey) return;
    const { key, altKey } = event;
    const printable = key.length === 1 && key !== ' ' && !altKey;
    const active = this.activeIndex();
    const last = this.opts.length - 1;
    const moves: Record<string, [number, number]> = {
      ArrowDown: [active + 1, 1],
      ArrowUp: [active - 1, -1],
      Home: [0, 1],
      End: [last, -1],
      PageDown: [active + 10, 1],
      PageUp: [active - 10, -1],
    };
    if (!this.opened) {
      // Closed (§7.2): Down, Up, Enter and Space open; Home, End and typing open and move.
      if (!printable && !['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(key))
        return;
      event.preventDefault();
      this.open();
      if (key === 'Home' || key === 'End') this.activate(this.near(...moves[key]!));
      else if (printable) this.typeahead(key);
      return;
    }
    if (key === 'Tab') {
      // Choose and close, and let focus move on.
      this.choose(active);
      this.close();
      return;
    }
    if (key === 'Enter' || key === ' ' || (key === 'ArrowUp' && altKey)) {
      this.choose(active);
      this.close();
    } else if (key === 'Escape') this.close();
    else if (printable) this.typeahead(key);
    else if (moves[key]) this.activate(this.near(...moves[key]!));
    else return;
    event.preventDefault();
  }

  /** Index of the listbox option an event happened on, or -1. */
  private optionAt(event: Event): number {
    const item = (event.target as Element).closest('.option');
    return item ? Number(item.id.slice('option-'.length)) : -1;
  }

  protected override rendered(): void {
    const combobox = this.ref('combobox')!;
    const listbox = this.ref('listbox')!;
    combobox.addEventListener('keydown', (event) => this.onKey(event));
    // The browser's light dismiss closes the listbox on the pointerup of a click on the combobox;
    // remembering the state at pointerdown keeps that click from opening it again.
    combobox.addEventListener('pointerdown', () => (this.pressedOpen = this.opened));
    combobox.addEventListener('click', () => {
      const wasOpen = this.pressedOpen ?? this.opened;
      this.pressedOpen = undefined;
      if (wasOpen) this.close();
      else this.open();
    });
    this.ref('label')!.addEventListener('click', () => combobox.focus());
    // Focus stays on the combobox (aria-activedescendant) while the pointer is on the listbox.
    listbox.addEventListener('pointerdown', (event) => event.preventDefault());
    listbox.addEventListener('pointermove', (event) => {
      const i = this.optionAt(event);
      if (i >= 0 && i !== this.activeIndex() && !this.opts[i]?.disabled) this.activate(i);
    });
    listbox.addEventListener('click', (event) => {
      const i = this.optionAt(event);
      if (i < 0 || this.opts[i]?.disabled) return;
      this.choose(i);
      this.close();
    });
    // Light dismiss and the browser's own Escape close the popover without us; follow it.
    listbox.addEventListener('toggle', () => {
      if (!listbox.matches(':popover-open')) this.close();
    });
    // Focus moved elsewhere by a script, assistive tech or into a frame. Clicks on the listbox
    // keep focus here (its pointerdown is cancelled), and leaving the window keeps it open.
    combobox.addEventListener('focusout', (event) => {
      const to = event.relatedTarget as Node | null;
      if (to ? !this.shadowRoot!.contains(to) : document.hasFocus()) this.close();
    });
  }

  protected override willUpdate(changed: ReadonlySet<string>): void {
    if (changed.has('value') && !this.dirty) this.current = String(this.props.value);
  }

  protected override update(changed: ReadonlySet<string>): void {
    const combobox = this.ref('combobox');
    if (changed.has('label')) setText(this.ref('label'), String(this.props.label));
    if (changed.has('helpText')) setText(this.ref('help-text'), String(this.props.helpText));
    if (changed.has('required')) {
      setOptionalAttribute(combobox, 'aria-required', this.props.required ? 'true' : '');
    }
    if (changed.has('disabled')) {
      const off = this.isDisabled;
      setOptionalAttribute(combobox, 'aria-disabled', off ? 'true' : '');
      setOptionalAttribute(combobox, 'tabindex', off ? '' : '0');
      if (off) this.close();
    }
    if (changed.has('value') || changed.has('placeholder')) this.sync();
    else if (changed.has('required') || changed.has('errorText')) this.commit();
  }

  protected override connected(): void {
    this.observer ??= new MutationObserver(() => this.sync());
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'disabled'],
    });
    this.sync();
  }

  protected override disconnected(): void {
    this.observer?.disconnect();
    this.close();
  }

  /** Like a native select: an option whose value is "" submits name=; no option, nothing. */
  protected formValue(): string | null {
    return pickOption(this.opts, this.current) ? this.current : null;
  }
  protected validate(): void {
    if (this.props.required === true && this.chosen() === '') {
      this.internals.setValidity(
        { valueMissing: true },
        requiredMessage('select', 'Please select an item in the list.'),
        this.ref('combobox') ?? undefined,
      );
    } else {
      this.internals.setValidity({});
    }
    setText(
      this.ref('error-text'),
      String(this.props.errorText) || this.internals.validationMessage,
    );
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
