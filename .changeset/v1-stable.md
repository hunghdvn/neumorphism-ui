---
'@neumorphism-ui/elements': patch
'@neumorphism-ui/tokens': patch
'@neumorphism-ui/ssr': patch
'@neumorphism-ui/react': patch
---

First stable release. From here on, breaking changes need a new major version.

Known limitations, planned for 1.x:

- SSR: a streamed declarative shadow root is adopted once its `data-ref` start tags have arrived, so it can be adopted before the last ref's text. Roots still unfinished after `DOMContentLoaded` are rendered again.
- `neu-button-group`: `::slotted(*)` variables leak through wrapper elements, and an icon button of another size keeps its own square size inside a group.
- `neu-icon`: the sanitizer rejects prefixed `<svg:svg>` roots.
- Forms: an `<input type="image">` is not used as the default button for implicit submission.
- `neu-radio-group`: inserting many radios at once costs O(N²).
- Screen readers: `neu-select` and `neu-radio-group` were checked through Chromium's accessibility tree, not yet by hand with NVDA or VoiceOver.
