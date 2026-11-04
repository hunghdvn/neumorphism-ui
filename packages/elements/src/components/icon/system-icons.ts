const BODIES: Readonly<Record<string, string>> = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'chevron-up': '<path d="M6 15l6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>',
};

/** The built-in icon as an SVG string, or undefined for an unknown name. DOM-free. */
export function systemIconSvg(name: string): string | undefined {
  const body = Object.hasOwn(BODIES, name) ? BODIES[name] : undefined;
  if (body === undefined) return undefined;
  return `<svg part="svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
