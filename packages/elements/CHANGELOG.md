# @neumorphism-ui/elements

## 1.0.0-next.1

### Patch Changes

- e4bb8cb: Releases are published from CI through npm trusted publishing (OIDC), still with provenance. No code changes.

## 1.0.0-next.0

### Major Changes

- 876930c: Phase 1: theme tokens, the NeuElement base class, neu-button, neu-switch, neu-text-field,
  SSR helpers (renderDSD, transformHtml, Nuxt module) and React wrappers.

### Minor Changes

- 28a68b5: Phase 2: neu-icon, registerIconLibrary, neu-icon-button, neu-button-group, neu-surface,
  neu-divider, neu-badge, neu-avatar, neu-spinner; base-class hardening.

  Consumer-visible changes:

  - `PropDecl` string props with `values` now require `default`. This is a TypeScript break for
    custom component definitions.
  - `isSubmitButton` now recognises neu-icon-button and any other `NeuButton` subclass, whatever its
    tag, so it can be the default button for implicit submission (Enter in a text field).
  - A server-rendered shadow root still missing parts once the page has loaded (a truncated
    response) is rendered afresh from the template instead of being adopted half-empty.
  - `@neumorphism-ui/react` re-exports `registerIconLibrary` and the `IconLibrary` type.
  - A neu-button submit reports no `SubmitEvent.submitter` (it stays `null`), so
    `new FormData(form, event.submitter)` and React 19 form actions keep working.
  - neu-avatar without `label` is decorative (`aria-hidden`) instead of an unnamed image.
