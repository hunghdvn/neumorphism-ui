---
'@neumorphism-ui/elements': minor
'@neumorphism-ui/tokens': minor
'@neumorphism-ui/ssr': minor
'@neumorphism-ui/react': minor
---

Phase 4a: API freeze for 1.0.

- Every prop now reflects to its attribute except a form control's current value (`value`, or
  `checked` for checkbox and switch) and checkbox `indeterminate`. A non-finite number removes the
  attribute.
- New entry `@neumorphism-ui/elements/docs.js` exports `componentDocs`. Docs metadata moved out of
  the runtime definitions into `<name>.docs.ts`, so `ComponentDef` no longer has a `docs` field and
  the CDN bundle is smaller (20.97 to 18.96 KB gzip). Every prop is described and eight tags have
  keyboard tables; descriptions appear in `custom-elements.json`.
- New `label` slot on `neu-select` and `neu-radio-group`; the radio group's accessible name follows
  the slotted label.
- The internal icons of `neu-checkbox`, `neu-number-field` and `neu-select` no longer expose
  `part="svg"`. `neu-icon`, `neu-icon-button` and `neu-avatar` keep it.
- Fixes: in a form, Enter that commits an IME composition in `neu-text-field`, `neu-number-field`
  or a plain `<input>` is no longer a submit attempt, so required fields do not turn user-invalid;
  this now covers Safari (keyCode 229). AltGr characters take part in `neu-select` typeahead; hovering an option no longer scrolls the listbox; `neu-avatar` recovers
  after a stale image error and treats whitespace-only initials as none;
  `neu-radio-group[label]:not(:defined)` reserves its label row; `transformHtml` skips HTML comments
  when reading select options.
- The size budget measures each component without core, the shared modules (`components/shared/`,
  their own 3 KB row) and the parent component. The 3.5 KB exception of `neu-number-field` is gone.
- README: ssr Limitations now cover a RangeError on huge output and comments containing
  `</neu-select>`, `</neu-option>` or `<neu-option`.
