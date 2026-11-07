/**
 * Mirrors Starlight's light/dark theme onto every `.demo` and every `[data-theme-sync]` element
 * (the playground controls), so they use the matching token palette. The playground preview is
 * deliberately not synced: its theme is the playground's own switch.
 */
function sync(): void {
  const theme = document.documentElement.dataset.theme;
  if (theme !== 'light' && theme !== 'dark') return;
  for (const el of document.querySelectorAll<HTMLElement>('.demo, [data-theme-sync]')) {
    el.dataset.neuTheme = theme;
  }
}

sync();
new MutationObserver(sync).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
});
