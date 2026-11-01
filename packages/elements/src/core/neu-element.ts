import type { ComponentDef } from './define.js';
import {
  attributeName,
  coerceProperty,
  parseAttribute,
  parseProps,
  serializeAttribute,
  type PropDecl,
  type PropValue,
} from './props.js';

/**
 * HTMLElement does not exist in Node (SSR, React server rendering). Falling back to an empty
 * class lets every module be imported there; nothing is ever constructed on the server.
 */
const ServerSafeHTMLElement: typeof HTMLElement =
  (globalThis.HTMLElement as typeof HTMLElement | undefined) ??
  (class {} as unknown as typeof HTMLElement);

const sheets = new WeakMap<ComponentDef, CSSStyleSheet>();
/** Getters that define() installed, as opposed to accessors an author wrote. */
const installedGetters = new WeakSet<() => unknown>();

function sheetFor(def: ComponentDef): CSSStyleSheet {
  let sheet = sheets.get(def);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(def.styles);
    sheets.set(def, sheet);
  }
  return sheet;
}

export abstract class NeuElement extends ServerSafeHTMLElement {
  declare static def: ComponentDef;
  /** Own properties to re-apply after upgrade besides def.props (spec §6.2 step 3). */
  static extraProperties: readonly string[] = [];

  static get observedAttributes(): string[] {
    return Object.entries(this.def.props).map(([key, decl]) => attributeName(key, decl));
  }

  /** Installs accessors for def.props and registers the tag. Safe to call in Node. */
  static define(): void {
    const def = this.def;
    for (const [key, decl] of Object.entries(def.props)) {
      if (this.definesAccessor(key)) continue;
      const get = function (this: NeuElement) {
        return this.props[key];
      };
      installedGetters.add(get);
      Object.defineProperty(this.prototype, key, {
        configurable: true,
        enumerable: true,
        get,
        set(this: NeuElement, value: unknown) {
          this.setProp(key, coerceProperty(decl, value));
        },
      });
    }
    const registry = globalThis.customElements as CustomElementRegistry | undefined;
    if (registry && !registry.get(def.tag)) {
      registry.define(def.tag, this as unknown as CustomElementConstructor);
    }
  }

  /**
   * True when this class defines `key`, or a class between it and NeuElement wrote its own
   * accessor for it. Accessors that define() installed on a parent do not count: they coerce with
   * the parent's declarations, and this class may declare the prop differently.
   */
  private static definesAccessor(key: string): boolean {
    if (Object.prototype.hasOwnProperty.call(this.prototype, key)) return true;
    let proto = Object.getPrototypeOf(this.prototype) as object | null;
    for (; proto !== null && proto !== NeuElement.prototype; proto = Object.getPrototypeOf(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (descriptor) return !(descriptor.get && installedGetters.has(descriptor.get));
    }
    return false;
  }

  protected readonly internals: ElementInternals;
  protected readonly props: Record<string, PropValue>;
  private root: ShadowRoot | null = null;
  private readonly refs = new Map<string, Element>();
  private reflecting = false;
  private hasConnected = false;
  private formDisabled = false;
  /** The author's tabindex (null when none is set), kept current by syncFocusable. */
  private authorTabIndex: string | null = null;
  /** The tabindex syncFocusable last left on the host (null: removed; undefined: never ran). */
  private writtenTabIndex: string | null | undefined;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.props = parseProps(this.def.props, (name) => this.getAttribute(name));
    // Disabled controls emit no events at all, including the native click (spec §6.4).
    this.addEventListener(
      'click',
      (event) => {
        if (!this.isDisabled) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }

  connectedCallback(): void {
    if (!this.hasConnected) {
      this.hasConnected = true;
      this.upgradeProperties();
      this.update(this.allKeys());
      this.ensureRoot();
    }
    this.connected();
  }

  disconnectedCallback(): void {
    this.disconnected();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (this.reflecting) return;
    for (const [key, decl] of Object.entries(this.def.props)) {
      if (attributeName(key, decl) === name) {
        this.setProp(key, parseAttribute(decl, value), true);
        return;
      }
    }
  }

  /** Called by the browser for form-associated subclasses inside a disabled fieldset. */
  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    if (this.hasConnected) this.update(new Set(['disabled']));
  }

  protected get def(): ComponentDef {
    return (this.constructor as typeof NeuElement).def;
  }

  protected get isDisabled(): boolean {
    return this.props.disabled === true || this.formDisabled;
  }

  /** Element marked data-ref="name" in the shadow root, or null before the root exists. */
  protected ref<T extends Element = HTMLElement>(name: string): T | null {
    if (!this.root) return null;
    let el = this.refs.get(name);
    if (!el) {
      const found = this.root.querySelector(`[data-ref="${name}"]`);
      if (!found) return null;
      this.refs.set(name, found);
      el = found;
    }
    return el as T;
  }

  protected setProp(key: string, value: PropValue, fromAttribute = false): void {
    const decl = this.def.props[key];
    if (!decl || Object.is(this.props[key], value)) return;
    this.props[key] = value;
    if (!fromAttribute && decl.reflect) this.reflect(key, decl, value);
    const changed = new Set([key]);
    this.willUpdate(changed);
    if (this.hasConnected) this.update(changed);
  }

  protected toggleState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }

  /**
   * Focusable: the author's tabindex, or 0. Not focusable: no tabindex at all.
   * A tabindex other than the one this method last left there was set (or removed) by the author
   * since, as a roving-tabindex widget or a framework re-render does; it becomes the author's value.
   */
  protected syncFocusable(focusable: boolean): void {
    const current = this.getAttribute('tabindex');
    if (current !== this.writtenTabIndex) this.authorTabIndex = current;
    const wanted = focusable ? (this.authorTabIndex ?? '0') : null;
    if (wanted === null) this.removeAttribute('tabindex');
    else if (current !== wanted) this.setAttribute('tabindex', wanted);
    this.writtenTabIndex = wanted;
  }

  /** For controls whose host is the control: aria-disabled and focusability follow isDisabled. */
  protected syncDisabledState(): void {
    this.internals.ariaDisabled = this.isDisabled ? 'true' : null;
    this.syncFocusable(!this.isDisabled);
  }

  /** Runs on every prop change, connected or not. Keep it free of DOM work. */
  protected willUpdate(_changed: ReadonlySet<string>): void {}
  /** Patches host state and shadow DOM for the changed props. Must be idempotent. */
  protected update(_changed: ReadonlySet<string>): void {}
  /** Runs once, after the shadow root exists (rendered or adopted from SSR). */
  protected rendered(): void {}
  protected connected(): void {}
  protected disconnected(): void {}

  private allKeys(): Set<string> {
    return new Set(Object.keys(this.def.props));
  }

  private reflect(key: string, decl: PropDecl, value: PropValue): void {
    const attribute = serializeAttribute(decl, value);
    const name = attributeName(key, decl);
    this.reflecting = true;
    try {
      if (attribute === null) this.removeAttribute(name);
      else this.setAttribute(name, attribute);
    } finally {
      this.reflecting = false;
    }
  }

  private upgradeProperties(): void {
    const ctor = this.constructor as typeof NeuElement;
    const self = this as unknown as Record<string, unknown>;
    for (const key of [...Object.keys(ctor.def.props), ...ctor.extraProperties]) {
      if (!Object.prototype.hasOwnProperty.call(this, key)) continue;
      const value = self[key];
      delete self[key];
      self[key] = value;
    }
  }

  private ensureRoot(): void {
    if (this.root) return;
    const existing = this.internals.shadowRoot;
    if (existing) {
      this.adoptRoot(existing);
      return;
    }
    if (document.readyState === 'loading' && this.parserMayAttachRoot()) {
      this.waitForParser();
      return;
    }
    const root = this.attachShadow({
      mode: 'open',
      delegatesFocus: this.def.delegatesFocus ?? false,
    });
    root.innerHTML = this.def.template(this.props).value;
    this.adoptRoot(root);
  }

  /**
   * While the document loads, the parser may not have reached this element's declarative shadow
   * root yet (spec §8.1). That is only possible while nothing has been parsed inside or after the
   * element; one created by script in the middle of the page renders at once.
   */
  private parserMayAttachRoot(): boolean {
    if (this.firstChild !== null || this.nextSibling !== null) return false;
    for (let node = this.parentNode; node !== null; node = node.parentNode) {
      if (node.nextSibling !== null) return false;
    }
    return true;
  }

  /**
   * Resumes as soon as a child or a following node shows the parser has moved past the element,
   * with DOMContentLoaded as the fallback. A shadow root alone is not enough: its contents may
   * still be streaming in.
   */
  private waitForParser(): void {
    const resume = () => {
      observer.disconnect();
      document.removeEventListener('DOMContentLoaded', resume);
      this.ensureRoot();
    };
    const observer = new MutationObserver(() => {
      if (!this.parserMayAttachRoot()) resume();
    });
    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', resume);
  }

  private adoptRoot(root: ShadowRoot): void {
    this.root = root;
    root.adoptedStyleSheets = [sheetFor(this.def)];
    root.querySelector('style[data-neu-ssr]')?.remove();
    this.rendered();
    this.update(this.allKeys());
  }
}
