---
'@neumorphism-ui/elements': minor
'@neumorphism-ui/tokens': minor
'@neumorphism-ui/ssr': minor
'@neumorphism-ui/react': minor
---

Phase 4a: API freeze for 1.0.

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
