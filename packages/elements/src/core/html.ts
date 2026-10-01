const RAW = Symbol('neu.raw');

/** A string that is already safe HTML. Only `html` and `unsafeHTML` create one. */
export interface RawHtml {
  readonly [RAW]: true;
  readonly value: string;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Marks markup as trusted. Only for library-owned markup such as built-in SVG icons. */
export function unsafeHTML(value: string): RawHtml {
  return { [RAW]: true, value };
}

export function isRawHtml(value: unknown): value is RawHtml {
  return typeof value === 'object' && value !== null && RAW in value;
}

function render(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  if (isRawHtml(value)) return value.value;
  return escapeHtml(String(value));
}

/** Tagged template that escapes every interpolated value unless it is RawHtml. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): RawHtml {
  let out = strings[0] ?? '';
  values.forEach((value, index) => {
    out += render(value) + (strings[index + 1] ?? '');
  });
  return unsafeHTML(out);
}
