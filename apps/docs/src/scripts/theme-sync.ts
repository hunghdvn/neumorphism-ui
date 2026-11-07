/** Mirrors Starlight's light/dark theme onto every `.demo`, so the demos use the matching token palette. */
function sync(): void {
  const theme = document.documentElement.dataset.theme;
  if (theme !== 'light' && theme !== 'dark') return;
  for (const demo of document.querySelectorAll<HTMLElement>('.demo')) {
    demo.dataset.neuTheme = theme;
  }
}

sync();
new MutationObserver(sync).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
});
