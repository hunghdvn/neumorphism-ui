import { afterEach, describe, expect, test } from 'vitest';
import { defineComponent } from './define.js';
import { setText } from './dom.js';
import { html } from './html.js';
import { NeuElement } from './neu-element.js';

const docs = { summary: '', events: [], slots: [], parts: [], cssProperties: [] };

const probeDef = defineComponent({
  tag: 'neu-probe',
  props: {
    label: { type: 'string', default: 'hi' },
    size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg'], reflect: true },
    disabled: { type: 'boolean', reflect: true },
    count: { type: 'number', default: 1 },
  },
  styles: ':host { display: block; }',
  template: (p) => html`<span data-ref="label" part="label">${p.label}</span>`,
  docs,
});

class NeuProbe extends NeuElement {
  static override def = probeDef;
  declare label: string;
  declare size: 'sm' | 'md' | 'lg';
  declare disabled: boolean;
  declare count: number;
  renders = 0;
  connects = 0;
  readonly updates: string[][] = [];

  protected override rendered(): void {
    this.renders++;
  }
  protected override connected(): void {
    this.connects++;
  }
  protected override update(changed: ReadonlySet<string>): void {
    this.updates.push([...changed].sort());
    setText(this.ref('label'), String(this.props.label));
  }
}
NeuProbe.define();

function mount<T extends Element>(markup: string): T {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.firstElementChild as T;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('rendering', () => {
  test('renders the template into an open shadow root with one shared sheet', () => {
    const el = mount<NeuProbe>('<neu-probe label="Hello"></neu-probe>');
    const other = mount<NeuProbe>('<neu-probe></neu-probe>');
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('Hello');
    expect(el.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
    expect(other.shadowRoot?.adoptedStyleSheets[0]).toBe(el.shadowRoot?.adoptedStyleSheets[0]);
  });

  test('works when attributes arrive after construction', () => {
    const el = document.createElement('neu-probe') as NeuProbe;
    el.setAttribute('label', 'Late');
    document.body.append(el);
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('Late');
  });
});

describe('attributes and properties', () => {
  test('attributes parse into typed properties', () => {
    const el = mount<NeuProbe>('<neu-probe size="lg" disabled count="5"></neu-probe>');
    expect([el.size, el.disabled, el.count]).toEqual(['lg', true, 5]);
  });

  test('only reflect: true props write back to attributes', () => {
    const el = mount<NeuProbe>('<neu-probe></neu-probe>');
    el.size = 'sm';
    el.disabled = true;
    el.label = 'x';
    expect(el.getAttribute('size')).toBe('sm');
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('label')).toBe(false);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  test('invalid values fall back to defaults silently', () => {
    const el = mount<NeuProbe>('<neu-probe size="huge" count="abc"></neu-probe>');
    expect([el.size, el.count]).toEqual(['md', 1]);
    el.size = 'xl' as never;
    expect(el.size).toBe('md');
  });

  test('removing an attribute restores the default', () => {
    const el = mount<NeuProbe>('<neu-probe size="lg" label="A"></neu-probe>');
    el.removeAttribute('size');
    el.removeAttribute('label');
    expect(el.size).toBe('md');
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('hi');
  });

  test('setting an unchanged value does not run update', () => {
    const el = mount<NeuProbe>('<neu-probe label="A"></neu-probe>');
    const before = el.updates.length;
    el.label = 'A';
    el.setAttribute('label', 'A');
    expect(el.updates.length).toBe(before);
    el.label = 'B';
    expect(el.updates.at(-1)).toEqual(['label']);
  });
});

describe('define()', () => {
  test('keeps an accessor that a class between the element and NeuElement defines', () => {
    class LabelledBase extends NeuElement {
      static override def = { ...probeDef, tag: 'neu-probe-accessor' };
      get label(): string {
        return 'from the base class';
      }
    }
    class Leaf extends LabelledBase {}
    Leaf.define();
    const el = document.createElement('neu-probe-accessor') as Leaf;
    expect(el.label).toBe('from the base class');
    expect(Object.prototype.hasOwnProperty.call(Leaf.prototype, 'label')).toBe(false);
  });

  test('a subclass that redeclares a prop gets its own accessor, not the parent one', () => {
    const wideDef = defineComponent({
      tag: 'neu-probe-wide',
      props: {
        ...probeDef.props,
        size: { type: 'string', default: 'md', values: ['sm', 'md', 'lg', 'xl'], reflect: true },
      },
      styles: probeDef.styles,
      template: (p) => html`<span data-ref="label" part="label">${p.label}</span>`,
      docs,
    });
    class NeuProbeWide extends NeuProbe {
      // TypeScript cannot express a subclass that redeclares one of its parent's props.
      static override def = wideDef as unknown as typeof probeDef;
    }
    NeuProbeWide.define();
    const el = document.createElement('neu-probe-wide') as NeuProbeWide;
    el.size = 'xl' as never;
    expect(el.size).toBe('xl');
  });
});

describe('lifecycle', () => {
  test('re-connecting does not re-render', () => {
    const el = mount<NeuProbe>('<neu-probe></neu-probe>');
    const span = el.shadowRoot!.querySelector('span');
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
    expect(el.renders).toBe(1);
    expect(el.connects).toBe(2);
    expect(el.shadowRoot!.querySelector('span')).toBe(span);
  });

  test('properties set before the element is defined are applied after upgrade', async () => {
    const tag = 'neu-probe-late';
    const el = document.createElement(tag) as HTMLElement & { label?: string };
    el.label = 'Early';
    document.body.append(el);
    class NeuProbeLate extends NeuProbe {
      static override def = { ...probeDef, tag };
    }
    NeuProbeLate.define();
    await customElements.whenDefined(tag);
    expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('Early');
    expect(Object.prototype.hasOwnProperty.call(el, 'label')).toBe(false);
  });

  test('formDisabledCallback runs willUpdate before update', () => {
    class NeuProbeForm extends NeuElement {
      static override def = { ...probeDef, tag: 'neu-probe-form' };
      static formAssociated = true;
      readonly calls: string[] = [];
      protected override willUpdate(changed: ReadonlySet<string>): void {
        this.calls.push(...[...changed].map((key) => `willUpdate:${key}`));
      }
      protected override update(changed: ReadonlySet<string>): void {
        this.calls.push(...[...changed].map((key) => `update:${key}`));
      }
    }
    NeuProbeForm.define();
    const fieldset = mount<HTMLFieldSetElement>(
      '<fieldset><neu-probe-form></neu-probe-form></fieldset>',
    );
    const el = fieldset.firstElementChild as NeuProbeForm;
    el.calls.length = 0;
    fieldset.disabled = true;
    expect(el.calls).toEqual(['willUpdate:disabled', 'update:disabled']);
  });
});

describe('declarative shadow DOM', () => {
  test('adopts an existing shadow root without re-rendering', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.setHTMLUnsafe(
      '<neu-probe label="SSR"><template shadowrootmode="open"><style data-neu-ssr>:host{}</style>' +
        '<span data-ref="label" part="label">SSR</span></template></neu-probe>',
    );
    const el = doc.body.firstElementChild as NeuProbe;
    const span = el.shadowRoot!.querySelector('span');
    document.body.append(document.adoptNode(el));
    expect(el).toBeInstanceOf(NeuProbe);
    expect(el.shadowRoot!.querySelector('span')).toBe(span);
    expect(el.shadowRoot!.querySelector('style[data-neu-ssr]')).toBeNull();
    expect(el.shadowRoot!.adoptedStyleSheets).toHaveLength(1);
    expect(el.renders).toBe(1);
  });

  test('while the document is loading it waits for a declarative root instead of creating one', () => {
    // An own property shadows Document.prototype.readyState; deleting it restores the real getter.
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    try {
      const el = document.createElement('neu-probe') as NeuProbe;
      document.body.append(el);
      expect(el.shadowRoot).toBeNull();
      // The parser now attaches the declarative root (simulated), then the document finishes.
      const root = el.attachShadow({ mode: 'open' });
      root.innerHTML = '<span data-ref="label" part="label">from parser</span>';
      const span = root.querySelector('span');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      expect(el.renders).toBe(1);
      expect(el.shadowRoot!.querySelector('span')).toBe(span);
      expect(span!.textContent).toBe('hi');
    } finally {
      delete (document as { readyState?: unknown }).readyState;
    }
    expect(document.readyState).toBe('complete');
  });

  /** Runs fn with document.readyState reporting 'loading', as while a page still streams. */
  async function whileLoading(fn: () => void | Promise<void>): Promise<void> {
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    try {
      await fn();
    } finally {
      delete (document as { readyState?: unknown }).readyState;
    }
  }

  test('while loading, an element inserted before an existing node renders at once', async () => {
    await whileLoading(() => {
      const sibling = document.createElement('p');
      document.body.append(sibling);
      const el = document.createElement('neu-probe') as NeuProbe;
      document.body.insertBefore(el, sibling);
      expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('hi');
      expect(el.renders).toBe(1);
    });
  });

  test('while loading, the last element without children waits until a node follows it', async () => {
    await whileLoading(async () => {
      const el = document.createElement('neu-probe') as NeuProbe;
      document.body.append(el);
      expect(el.shadowRoot).toBeNull();
      await Promise.resolve();
      expect(el.shadowRoot).toBeNull();
      document.body.append(document.createElement('p'));
      await Promise.resolve();
      expect(el.shadowRoot?.querySelector('[part=label]')?.textContent).toBe('hi');
      expect(el.renders).toBe(1);
      // Later mutations and DOMContentLoaded do not render it again.
      document.body.append(document.createElement('p'));
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
      expect(el.renders).toBe(1);
    });
  });

  test('while loading, a waiting element resumes when it gains a child', async () => {
    await whileLoading(async () => {
      const el = document.createElement('neu-probe') as NeuProbe;
      document.body.append(el);
      expect(el.shadowRoot).toBeNull();
      el.append('light');
      await Promise.resolve();
      expect(el.renders).toBe(1);
    });
  });

  test('while loading, an incomplete declarative root is not adopted', async () => {
    await whileLoading(async () => {
      const el = document.createElement('neu-probe') as NeuProbe;
      document.body.append(el);
      // The parser has attached the declarative root, but its data-ref nodes are still streaming.
      const root = el.attachShadow({ mode: 'open' });
      root.innerHTML = '<b>partial</b>';
      document.body.append(document.createElement('p'));
      await Promise.resolve();
      expect(el.renders).toBe(0);
      const label = document.createElement('span');
      label.dataset.ref = 'label';
      root.append(label);
      await Promise.resolve();
      expect(el.renders).toBe(1);
      expect(el.shadowRoot!.querySelector('[data-ref=label]')).toBe(label);
      expect(label.textContent).toBe('hi');
    });
  });

  test('a declarative root still unfinished when the page has loaded is rendered afresh', async () => {
    await whileLoading(async () => {
      const el = document.createElement('neu-probe') as NeuProbe;
      el.setAttribute('label', 'there');
      document.body.append(el);
      // A truncated server response: the root never gets its data-ref nodes.
      const root = el.attachShadow({ mode: 'open' });
      root.innerHTML = '<b>partial</b><style data-neu-ssr></style>';
      document.body.append(document.createElement('p'));
      await Promise.resolve();
      expect(el.renders).toBe(0);
      document.dispatchEvent(new Event('DOMContentLoaded'));
      expect(el.renders).toBe(1);
      expect(el.shadowRoot).toBe(root);
      expect(root.querySelector('b')).toBeNull();
      expect(root.querySelector('[data-ref=label]')!.textContent).toBe('there');
      expect(root.adoptedStyleSheets).toHaveLength(1);
    });
  });

  test('a finished declarative root is adopted as it is, without rendering the template again', async () => {
    const el = document.createElement('neu-probe') as NeuProbe;
    const root = el.attachShadow({ mode: 'open' });
    root.innerHTML = '<span data-ref="label" part="label">hi</span>';
    const label = root.firstElementChild;
    document.body.append(el);
    expect(el.renders).toBe(1);
    expect(root.firstElementChild).toBe(label);
  });
});
