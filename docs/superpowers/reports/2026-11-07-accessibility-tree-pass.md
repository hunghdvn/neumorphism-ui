# Accessibility-tree pass: neu-select and neu-radio-group

Date: 2026-11-07. Code: `main` at 68a607a (the `1.0.0-next.4` elements). Browser: the Chromium
build of Playwright 1.63, on Windows.

## Why this instead of the screen reader checklist

The manual checklist (`2026-11-06-screen-reader-checklist.md`) was not run before 1.0. On
2026-11-07 the user decided to release 1.0 with this automated pass in its place. The manual pass
(NVDA with Firefox and Chrome, VoiceOver with Safari) is deferred until after 1.0, and anything it
finds is fixed in a 1.0.x patch. Spec §16 and the release plan's Task 6 record the decision.

## What was run

`screen-reader/ax-pass.mjs` serves `screen-reader/test-page.html` with the local builds (it needs
`pnpm build` first). The page carries every scenario of the checklist.

For each row of the checklist, the script presses the row's keys and then reads Chromium's
accessibility tree through the DevTools protocol, which is the data a screen reader receives. It
records:

- the focused element's name, role, states (expanded, checked, selected, disabled, required,
  invalid), value and description;
- the active option behind `aria-activedescendant`, with its position counted in the tree
  ("2 of 4");
- for a radio, its group's name and states;
- the number of `change` events.

It also records the same data for the native `<select>` and radios on the page, for the required
and invalid rows.

Run it with `node docs/superpowers/reports/screen-reader/ax-pass.mjs`, or with `--headed` to watch.

## Result

All 67 checklist rows pass at the accessibility-tree level.

| Section | Rows | Pass |
| --- | --- | --- |
| 1.1 Reaching the control | 2 | 2 |
| 1.2 Open and close | 10 | 10 |
| 1.3 Moving | 9 | 9 |
| 1.4 Choosing | 7 | 7 |
| 1.5 Typeahead (AltGr included) | 6 | 6 |
| 1.6 Disabled option | 3 | 3 |
| 1.7 Required and invalid | 4 | 4 |
| 1.8 Label from the slot | 3 | 3 |
| 2.1 Entering the group | 4 | 4 |
| 2.2 Arrow keys | 9 | 9 |
| 2.3 Disabled radio | 3 | 3 |
| 2.4 Group name | 4 | 4 |
| 2.5 Required and invalid | 3 | 3 |

Rows the checklist asks to record:

- **1.3 Down on the last option:** the active option stays on Date.
- **1.6 Click Cherry:** the value does not change and the listbox stays open.
- **1.6 and 2.3, disabled select or group:** Tab skips it.
- **1.7 Required select:**
  - Before a submit, the select is exposed as "Fruit, combobox, collapsed, required", with no
    invalid state.
  - After a failed submit, focus is on the select. It carries the validation message as its
    description ("Please select an item in the list."), still with no invalid state, because
    `aria-invalid` is not set in 1.0.
  - Once a value is chosen, the description is gone.
  - A native required `<select>` is exposed as invalid from page load.
- **1.8 Both a `label` attribute and a slotted label:** the name is the slotted label alone.
- **2.4 No label:** the radio group has an empty name. The radios carry only their own text.
- **2.5 Required group:**
  - The group is exposed as required and invalid from page load, before any interaction, so a
    reader may say "invalid" when entering an empty required group.
  - Native required radios in Chrome are also invalid from page load, so the group matches native
    behaviour.
  - Once a radio is checked, the invalid state is gone.

One more observation: the typeahead buffer survives closing and reopening within one second. For
example, "b", Escape, Down, then "d" searches for "bd" and matches nothing.

## Not covered

- **Speech.** This pass does not show what NVDA or VoiceOver say, or when. That includes:
  - whether moving `aria-activedescendant` is announced;
  - the expanded and collapsed announcements;
  - focus mode switching;
  - typeahead feedback;
  - whether the validation message is read.
- **Firefox and WebKit accessibility trees.** Spec §16 names engine differences with roles set on
  `ElementInternals` as the risk, and this pass checks Chromium only.
  - Playwright has no accessibility API for Firefox or WebKit.
  - Reading Playwright's Firefox through Windows UI Automation hung the browser.
  - The component tests run in all three engines but check behaviour and ARIA values, not the
    platform tree.

These belong to the deferred manual pass.
