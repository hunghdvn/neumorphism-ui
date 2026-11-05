import { renderIconInto } from './icon-loader.js';
import { iconLibraryVersion, onIconLibraryChange } from './icon-registry.js';

export interface IconDrawer {
  draw(): void;
  connected(): void;
  disconnected(): void;
}

/**
 * Keeps an element's icon container in step with its library and name: on prop changes and when
 * the library is registered again (while connected, or while the element was away), and never
 * twice for the same icon, so hydration and DOM moves write nothing. Used by neu-icon and
 * neu-icon-button. A closure rather than a class, so the minifier can shorten its state.
 */
export function iconDrawer(
  box: () => Element | null,
  library: () => string,
  name: () => string,
): IconDrawer {
  /** Library, name and library version of what the container shows or is loading. */
  let shown: string | undefined;
  let unsubscribe: (() => void) | undefined;
  const key = () => `${library()}\n${name()}\n${iconLibraryVersion(library())}`;
  const draw = () => {
    const container = box();
    if (!container) return;
    // The first draw finds the template's markup, rendered here or on the server: a system icon
    // is already in place.
    if (shown === undefined && library() === 'system') shown = key();
    if (key() === shown) return;
    shown = key();
    renderIconInto(container, library(), name());
  };
  return {
    draw,
    connected: () => {
      unsubscribe ??= onIconLibraryChange(draw);
      draw();
    },
    disconnected: () => {
      unsubscribe?.();
      unsubscribe = undefined;
    },
  };
}
