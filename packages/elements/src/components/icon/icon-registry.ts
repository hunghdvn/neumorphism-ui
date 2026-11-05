export interface IconLibrary {
  /** Markup that starts with `<` is an SVG; any other string, and a URL, is fetched. */
  resolve(name: string): string | URL;
}

const libraries = new Map<string, IconLibrary>();
/** How often each library has been registered, so a drawn icon knows when it went stale. */
const versions = new Map<string, number>();
const listeners = new Set<(library: string) => void>();

/** Registers a library. Registering a name again replaces it and reloads the icons using it. */
export function registerIconLibrary(name: string, library: IconLibrary): void {
  // The built-in set is not a registered library and cannot be replaced.
  if (name === 'system') return;
  libraries.set(name, library);
  versions.set(name, iconLibraryVersion(name) + 1);
  for (const listener of [...listeners]) listener(name);
}

export function getIconLibrary(name: string): IconLibrary | undefined {
  return libraries.get(name);
}

/** Changes every time the library is registered; 0 before the first time. */
export function iconLibraryVersion(name: string): number {
  return versions.get(name) ?? 0;
}

/** Calls `listener` with the name of every library that gets (re-)registered. Returns the unsubscribe. */
export function onIconLibraryChange(listener: (library: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
