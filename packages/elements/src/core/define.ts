import type { RawHtml } from './html.js';
import type { InferProps, PropsSchema } from './props.js';

export interface DocEntry {
  readonly name: string;
  readonly description: string;
}

export interface ComponentDocs {
  readonly summary: string;
  readonly events: readonly DocEntry[];
  readonly slots: readonly DocEntry[];
  readonly parts: readonly DocEntry[];
  readonly cssProperties: readonly DocEntry[];
}

export interface FormDef {
  /** The prop whose attribute holds the default value (spec §6.1). */
  readonly valueProp: 'value' | 'checked';
}

/** The DOM-free half of a component, shared by the element, SSR, React wrappers and docs. */
export interface ComponentDef<S extends PropsSchema = PropsSchema> {
  readonly tag: string;
  readonly props: S;
  readonly styles: string;
  template(props: InferProps<S>): RawHtml;
  readonly delegatesFocus?: boolean;
  readonly form?: FormDef;
  /** Properties set only from JS (no attribute), name to TypeScript type, for wrappers and the manifest. Type-only. */
  readonly properties?: Readonly<Record<string, string>>;
  readonly docs: ComponentDocs;
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
