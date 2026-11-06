import type { RawHtml } from './html.js';
import type { InferProps, PropsSchema } from './props.js';

export interface DocEntry {
  readonly name: string;
  readonly description: string;
}

export interface ComponentDocs {
  readonly summary: string;
  /** One line per prop of the def, per key of def.properties, and per defaultValue/defaultChecked. */
  readonly descriptions: Readonly<Record<string, string>>;
  readonly events: readonly DocEntry[];
  readonly slots: readonly DocEntry[];
  readonly parts: readonly DocEntry[];
  readonly cssProperties: readonly DocEntry[];
  /** name: the keys as spec §7 writes them; description: what they do. */
  readonly keyboard: readonly DocEntry[];
}

export interface FormDef {
  /** The prop whose attribute holds the default value (spec §6.1). */
  readonly valueProp: 'value' | 'checked';
}

/** One option child as the server reads it (spec §8.2): its value, label text and disabled state. */
export interface OptionData {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** What a server renderer knows beyond the attributes: the option children of a select (§8.3). */
export interface TemplateContext {
  readonly options?: readonly OptionData[];
}

/** The DOM-free half of a component, shared by the element, SSR, React wrappers and docs. */
export interface ComponentDef<S extends PropsSchema = PropsSchema> {
  readonly tag: string;
  readonly props: S;
  readonly styles: string;
  /** The client always renders without `ctx`; only a server renderer passes one. */
  template(props: InferProps<S>, ctx?: TemplateContext): RawHtml;
  readonly delegatesFocus?: boolean;
  readonly form?: FormDef;
  /** Properties set only from JS (no attribute), name to TypeScript type, for wrappers and the manifest. Type-only. */
  readonly properties?: Readonly<Record<string, string>>;
  /** Tag of the children a server renderer reads into `TemplateContext.options`. */
  readonly optionsFrom?: string;
}

export function defineComponent<const S extends PropsSchema>(
  def: ComponentDef<S>,
): ComponentDef<S> {
  return def;
}

/**
 * The element property that sets a form control's default (its value attribute), as wrappers and
 * generated types expose it: `defaultChecked` for `checked`, `defaultValue` for `value`.
 */
export function formDefaultProp(def: ComponentDef): 'defaultChecked' | 'defaultValue' | undefined {
  const valueProp = def.form?.valueProp;
  if (valueProp === 'checked') return 'defaultChecked';
  if (valueProp === 'value') return 'defaultValue';
  return undefined;
}
