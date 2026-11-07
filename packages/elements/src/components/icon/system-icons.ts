// Each body is its own export, so a component that needs one icon bundles only that icon.
export const checkBody = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
export const chevronDownBody = '<path d="M6 9l6 6 6-6"/>';
export const chevronUpBody = '<path d="M6 15l6-6 6 6"/>';
export const plusBody = '<path d="M12 5v14M5 12h14"/>';
export const minusBody = '<path d="M5 12h14"/>';
export const xBody = '<path d="M6 6l12 12M18 6L6 18"/>';
export const alertCircleBody = '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>';
export const userBody = '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>';

const BODIES: Readonly<Record<string, string>> = {
  check: checkBody,
  'chevron-down': chevronDownBody,
  'chevron-up': chevronUpBody,
  plus: plusBody,
  minus: minusBody,
  x: xBody,
  'alert-circle': alertCircleBody,
  user: userBody,
};

/** The SVG element around an icon body. DOM-free. */
export function svgWrap(body: string, part?: string): string {
  return `<svg${part ? ` part="${part}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** The built-in icon as an SVG string, or undefined for an unknown name. DOM-free. */
export function systemIconSvg(name: string): string | undefined {
  const body = Object.hasOwn(BODIES, name) ? BODIES[name] : undefined;
  return body === undefined ? undefined : svgWrap(body, 'svg');
}
