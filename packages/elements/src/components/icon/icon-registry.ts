export interface IconLibrary {
  /** Markup that starts with `<` is an SVG; any other string, and a URL, is fetched. */
  resolve(name: string): string | URL;
}

const libraries = new Map<string, IconLibrary>();
const listeners = new Set<(library: string) => void>();

/** Registers a library. Registering a name again replaces it and reloads the icons using it. */
export function registerIconLibrary(name: string, library: IconLibrary): void {
  libraries.set(name, library);
  for (const listener of [...listeners]) listener(name);
}

export function getIconLibrary(name: string): IconLibrary | undefined {
  return libraries.get(name);
}

/** Calls `listener` with the name of every library that gets (re-)registered. Returns the unsubscribe. */
export function onIconLibraryChange(listener: (library: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
