# @neumorphism-ui/react

## 1.0.0-next.4

### Patch Changes

- Updated dependencies [350a74e]
  - @neumorphism-ui/elements@1.0.0-next.4

## 1.0.0-next.3

### Minor Changes

- d23ccc1: Phase 4a: API freeze for 1.0.

  - Every prop now reflects to its attribute except a form control's current value (`value`, or
    `checked` for checkbox and switch) and checkbox `indeterminate`. A non-finite number removes the
    attribute. An empty string stays as `attr=""` when the prop's default is not empty (spinner
    `label`, the `value` of checkbox, switch and radio), so it no longer turns back into the default.
  - New entry `@neumorphism-ui/elements/docs.js` exports `componentDocs`. Docs metadata moved out of
    the runtime definitions into `<name>.docs.ts`, so `ComponentDef` no longer has a `docs` field and
    the CDN bundle is smaller (20.97 to 18.99 KB gzip). Every prop is described and eight tags have
    keyboard tables; descriptions appear in `custom-elements.json`.
  - New `label` slot on `neu-select` and `neu-radio-group`; the radio group's accessible name follows
    the slotted label. Editing a slotted label or help text no longer rebuilds an open listbox.
  - The internal icons of `neu-checkbox`, `neu-number-field` and `neu-select` no longer expose
    `part="svg"`. `neu-icon`, `neu-icon-button` and `neu-avatar` keep it.
  - Fixes: in a form, Enter that commits an IME composition in `neu-text-field`, `neu-number-field`
    or a plain `<input>` is no longer a submit attempt, so required fields do not turn user-invalid;
    this now covers Safari (keyCode 229). AltGr characters take part in `neu-select` typeahead,
    while other Ctrl+Alt chords are left alone; hovering an option no longer scrolls the listbox;
    `neu-avatar` recovers after a stale image error and treats whitespace-only initials as none;
    `neu-radio-group[label]:not(:defined)` reserves its label row.
  - A declarative shadow root rendered by an older version of a component (a page cached before an
    upgrade) is rendered afresh instead of being adopted with missing nodes.
  - SSR: `transformHtml` skips HTML comments when reading select options, treats `<!-->` as an empty
    comment, and skips whole tags in option text. The React wrappers read select options past a
    component inside a slotted label or help text.
  - The size budget measures each component without core, the shared modules (`components/shared/`,
    their own 3 KB row) and the parent component. The 3.5 KB exception of `neu-number-field` is gone.
  - README: ssr Limitations now cover a RangeError on huge output and comments containing
    `</neu-select>`, `</neu-option>` or `<neu-option`.

### Patch Changes

- Updated dependencies [d23ccc1]
  - @neumorphism-ui/elements@1.0.0-next.3

## 1.0.0-next.2

### Minor Changes

- 2cde5be: Phase 3: neu-textarea, neu-number-field, neu-checkbox, neu-radio-group and neu-radio, neu-slider,
  neu-select and neu-option; the selected label of a select is server-rendered by transformHtml and
  the React wrapper. `decodeEntities` (and so `transformHtml`) now decodes every named character
  reference of the HTML standard the way the browser does, legacy ones without a semicolon included;
  pass `true` as its second argument for an attribute value.

### Patch Changes

- Updated dependencies [2cde5be]
- Updated dependencies [86bc067]
  - @neumorphism-ui/elements@1.0.0-next.2

## 1.0.0-next.1

### Patch Changes

- e4bb8cb: Releases are published from CI through npm trusted publishing (OIDC), still with provenance. No code changes.
- Updated dependencies [e4bb8cb]
  - @neumorphism-ui/elements@1.0.0-next.1

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

### Patch Changes

- Updated dependencies [876930c]
- Updated dependencies [28a68b5]
  - @neumorphism-ui/elements@1.0.0-next.0
