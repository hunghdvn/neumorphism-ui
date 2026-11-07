export type PropDecl =
  | { readonly type: 'boolean'; readonly reflect?: boolean; readonly attribute?: string }
  | {
      readonly type: 'number';
      readonly default: number;
      readonly reflect?: boolean;
      readonly attribute?: string;
    }
  | {
      readonly type: 'string';
      readonly default: string;
      readonly values: readonly string[];
      readonly reflect?: boolean;
      readonly attribute?: string;
    }
  | {
      readonly type: 'string';
      readonly default?: string;
      readonly values?: never;
      readonly reflect?: boolean;
      readonly attribute?: string;
    };

export type PropsSchema = Readonly<Record<string, PropDecl>>;
export type PropValue = string | number | boolean;

type InferProp<D> = D extends { type: 'boolean' }
  ? boolean
  : D extends { type: 'number' }
    ? number
    : D extends { values: readonly (infer V extends string)[] }
      ? V
      : string;

export type InferProps<S extends PropsSchema> = { -readonly [K in keyof S]: InferProp<S[K]> };

/** `helpText` → `help-text`, unless the declaration names the attribute explicitly. */
export function attributeName(prop: string, decl: PropDecl): string {
  return decl.attribute ?? prop.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

/**
 * Every prop reflects to its attribute, except the live value of a form control (the def's
 * form.valueProp, whose attribute is only the default) and props that declare `reflect: false`.
 */
export function reflects(
  key: string,
  decl: PropDecl,
  def: { readonly form?: { readonly valueProp: string } },
): boolean {
  return decl.reflect ?? key !== def.form?.valueProp;
}

/** Attribute text (null when absent) → prop value. Invalid input silently becomes the default. */
export function parseAttribute(decl: PropDecl, raw: string | null): PropValue {
  switch (decl.type) {
    case 'boolean':
      return raw !== null;
    case 'number': {
      if (raw === null || raw.trim() === '') return decl.default;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : decl.default;
    }
    case 'string': {
      const fallback = decl.default ?? '';
      if (raw === null) return fallback;
      if (decl.values && !decl.values.includes(raw)) return fallback;
      return raw;
    }
  }
}

/** Value assigned through a JS property → prop value, with the same fallback rules. */
export function coerceProperty(decl: PropDecl, value: unknown): PropValue {
  if (decl.type === 'boolean') return Boolean(value);
  if (decl.type === 'number' && typeof value === 'number') {
    return Number.isFinite(value) ? value : decl.default;
  }
  return parseAttribute(decl, value === null || value === undefined ? null : String(value));
}

/**
 * Prop value → attribute text for reflection and SSR; null means "remove the attribute". The empty
 * string is removed only when that parses back to it, i.e. when the default is empty too.
 */
export function serializeAttribute(decl: PropDecl, value: PropValue): string | null {
  switch (decl.type) {
    case 'boolean':
      return value ? '' : null;
    case 'number':
      return Number.isFinite(value) ? String(value) : null;
    case 'string':
      return value === '' && !decl.default ? null : String(value);
  }
}

export function parseProps<S extends PropsSchema>(
  schema: S,
  read: (attribute: string) => string | null,
): InferProps<S> {
  const props: Record<string, PropValue> = {};
  for (const [key, decl] of Object.entries(schema)) {
    props[key] = parseAttribute(decl, read(attributeName(key, decl)));
  }
  return props as InferProps<S>;
}
