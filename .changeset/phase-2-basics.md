---
'@neu-ui/elements': minor
'@neu-ui/tokens': minor
'@neu-ui/ssr': minor
'@neu-ui/react': minor
---

Phase 2: neu-icon, registerIconLibrary, neu-icon-button, neu-button-group, neu-surface,
neu-divider, neu-badge, neu-avatar, neu-spinner; base-class hardening.

Consumer-visible changes:

- A Space keydown on neu-button and neu-switch is no longer `defaultPrevented` while it bubbles, so
  an ancestor can cancel it to prevent the activation.
- `PropDecl` string props with `values` now require `default`. This is a TypeScript break for
  custom component definitions.
- `isSubmitButton` now recognises neu-icon-button, so it can be the default button for implicit
  submission (Enter in a text field).
- `@neu-ui/react` re-exports `registerIconLibrary` and the `IconLibrary` type.
- A neu-button submit reports no `SubmitEvent.submitter` (it stays `null`), so
  `new FormData(form, event.submitter)` and React 19 form actions keep working.
- neu-avatar without `label` is decorative (`aria-hidden`) instead of an unnamed image.
