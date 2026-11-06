# Screen reader checklist: neu-select and neu-radio-group

Manual check required by the risk table in section 16 of the spec
(`docs/superpowers/specs/2026-10-01-neumorphism-ui-v1-design.md`). Run it before the 1.0 release.

## Setup

Run the whole checklist once per combination:

| Run | Screen reader | Browser | OS |
| --- | --- | --- | --- |
| A | NVDA | Firefox | Windows |
| B | NVDA | Chrome | Windows |
| C | VoiceOver | Safari | macOS |

- Page: the examples app, or any page with the markup below. Record the date, the exact versions
  and the tester at the top of each run.
- Each row is an action, the announcement to expect, and a box. Tick the box only when what you hear
  matches. Announcement wording differs between readers (for example "collapsed" vs "closed",
  "2 of 3" vs "2 of 3 items"); judge the content, not the exact words. Write any difference or defect
  under the row.
- Keys are Windows names. On macOS use the VoiceOver equivalents; Alt+Down is Option+Down.
- With NVDA, leave browse mode before keys (Tab to the control puts focus mode on by itself; if it
  does not, press NVDA+Space).

```html
<neu-select label="Fruit" name="fruit" value="apple">
  <neu-option value="apple">Apple</neu-option>
  <neu-option value="banana">Banana</neu-option>
  <neu-option value="cherry" disabled>Cherry</neu-option>
  <neu-option value="date">Date</neu-option>
</neu-select>

<neu-radio-group label="Size" name="size" value="md">
  <neu-radio value="sm">Small</neu-radio>
  <neu-radio value="md">Medium</neu-radio>
  <neu-radio value="lg" disabled>Large</neu-radio>
  <neu-radio value="xl">Extra large</neu-radio>
</neu-radio-group>
```

How neu-select works, for reference: it is the APG select-only combobox. Focus stays on the
combobox; the listbox is a popover inside the select's shadow root; the active option is exposed
through `aria-activedescendant`.

## 1. neu-select

### 1.1 Reaching the control

- [ ] Tab to the select. Expect: "Fruit, combobox, collapsed, Apple" (name, role, state, value).
- [ ] Move through the page with Shift+Tab and Tab. Expect: the select is announced the same way
      each time, and focus does not jump elsewhere.

### 1.2 Open and close

- [ ] Alt+Down. Expect: "expanded"; the current option, "Apple, 1 of 4", is announced.
- [ ] Escape. Expect: "collapsed"; the value is still Apple; focus stays on the select.
- [ ] Down (closed). Expect: it opens ("expanded") on the current option.
- [ ] Up (closed). Expect: it opens.
- [ ] Enter (closed). Expect: it opens.
- [ ] Space (closed). Expect: it opens.
- [ ] Home (closed). Expect: it opens with the first enabled option active ("Apple, 1 of 4").
- [ ] End (closed). Expect: it opens with the last enabled option active ("Date, 4 of 4").
- [ ] Click the select with the mouse while the reader runs. Expect: "expanded" is announced and
      the listbox is reachable with the keys below.
- [ ] Open, then click outside. Expect: it closes and "collapsed" is announced.

### 1.3 Moving through the options (open)

- [ ] Down. Expect: "Banana, 2 of 4"; focus is still on the combobox (no "listbox" focus change).
- [ ] Down again. Expect: Cherry is skipped; "Date, 4 of 4".
- [ ] Down on the last option. Expect: no movement, no error, no extra announcement.
- [ ] Up. Expect: "Banana, 2 of 4" (Cherry skipped on the way back).
- [ ] Home. Expect: "Apple, 1 of 4".
- [ ] End. Expect: "Date, 4 of 4".
- [ ] PageDown. Expect: it moves by up to 10, so it lands on the last enabled option.
- [ ] PageUp. Expect: it lands on the first enabled option.
- [ ] Hover an option with the mouse while the reader runs. Expect: the listbox does not scroll by
      itself and the announcement does not change focus.

### 1.4 Choosing

- [ ] Open, Down to Banana, Enter. Expect: it closes ("collapsed"); the value is announced as
      "Banana".
- [ ] Open, Down to Date, Space. Expect: it chooses Date and closes; "Date" is announced.
- [ ] Open, Down to Banana, Escape. Expect: it closes with the previous value kept (Date); Banana
      is not chosen.
- [ ] Open, Up to Banana, Tab. Expect: Banana is chosen and focus moves to the next control.
- [ ] Open, Up to Apple, Alt+Up. Expect: Apple is chosen and it closes; focus stays on the select.
- [ ] Click an option with the mouse. Expect: it is chosen, it closes, the new value is announced.
- [ ] After any choice, check that `change` fired once (the page log or devtools).

### 1.5 Typeahead

- [ ] Closed, type "b". Expect: it opens with "Banana" active and announced.
- [ ] Open, type "d". Expect: "Date, 4 of 4" becomes active.
- [ ] Open, type "c". Expect: nothing matches an enabled option (Cherry is disabled), so the active
      option does not change.
- [ ] Open, type "ba" quickly. Expect: still Banana (the prefix is built across keystrokes).
- [ ] Type a character, wait over one second, type another. Expect: the second starts a new search.

### 1.6 Disabled option

- [ ] Navigate across Cherry with Up and Down. Expect: it is never active and never announced as
      selectable.
- [ ] Click Cherry with the mouse. Expect: nothing is chosen and the listbox stays open.
- [ ] Browse the listbox content with the reader's own commands. Expect: Cherry is announced as
      "unavailable" (or "dimmed", "disabled").
- [ ] Put `disabled` on the select. Expect: Tab skips it, or the reader announces "unavailable".
      Alt+Down does nothing.

### 1.7 Required and invalid

Use `<neu-select label="Fruit" name="fruit" required>` with no value, inside a `<form>`.

- [ ] Tab to the select. Expect: "Fruit, combobox, collapsed, required" (and a blank or placeholder
      value).
- [ ] Press Enter on a button that submits the form with the select empty. Expect: the select
      becomes invalid; the reader announces "invalid entry" (or equivalent) and the validation
      message when focus lands on it.
- [ ] Choose an option, then re-check. Expect: "invalid" is gone.
- [ ] Set `invalid` by hand. Expect: "invalid entry" is announced on focus.

### 1.8 Label from the slot

Use `<neu-select name="fruit"><span slot="label">Favorite fruit</span> ...options</neu-select>` with
no `label` attribute.

- [ ] Tab to the select. Expect: "Favorite fruit, combobox, collapsed, ..." (the slotted text is the
      accessible name).
- [ ] Change the slotted text at runtime. Expect: the next time the select is focused, the new text
      is announced.
- [ ] Give the select both a `label` attribute and a slotted label. Expect: record which one is
      announced (the result must be one stable name, not both concatenated).

## 2. neu-radio-group

### 2.1 Entering the group

- [ ] Tab into the group with "Medium" checked. Expect: "Size, radio group" then "Medium, radio
      button, checked, 2 of 4" (the group name is announced when entering).
- [ ] Tab again. Expect: focus leaves the group (only one radio is tabbable).
- [ ] Shift+Tab back into the group. Expect: it lands on Medium again.
- [ ] Remove the value so nothing is checked, then Tab in. Expect: focus lands on the first enabled
      radio ("Small, radio button, not checked, 1 of 4").

### 2.2 Arrow keys

- [ ] Right (or Down) from Medium. Expect: Large is disabled, so it is skipped; "Extra large, radio
      button, checked, 4 of 4". The arrow both moves focus and selects.
- [ ] Right (or Down) from the last radio. Expect: it wraps to "Small, radio button, checked, 1 of 4".
- [ ] Left (or Up) from Small. Expect: it wraps to "Extra large, checked".
- [ ] Left from Extra large. Expect: Large is skipped; "Medium, checked, 2 of 4".
- [ ] Check that `change` fired once per move and the group value matches what was announced.
- [ ] Space on a focused radio that is not checked (move focus with the reader's own commands, or
      with a mouse click on the text then Shift+Tab). Expect: it becomes checked and is announced
      "checked".
- [ ] Space on the checked radio. Expect: no change, no extra announcement.

### 2.3 Disabled radio

- [ ] Arrow across Large in both directions. Expect: it is never focused or checked.
- [ ] Click Large. Expect: nothing happens.
- [ ] Browse to Large with the reader's own commands. Expect: "Large, radio button, unavailable,
      not checked, 3 of 4" (position counts include the disabled radio).
- [ ] Put `disabled` on the whole group. Expect: Tab skips it, or the reader announces
      "unavailable" for each radio.

### 2.4 Group name

- [ ] Group with `label="Size"`. Expect: entering the group announces "Size, radio group".
- [ ] Group with no `label` attribute and `<span slot="label">Shirt size</span>`. Expect: "Shirt size,
      radio group" (the accessible name follows the slotted text).
- [ ] Change the slotted text at runtime. Expect: the next entry announces the new text.
- [ ] Group with neither. Expect: record what is announced ("radio group" with no name is the
      accepted result; no crash, no stale text).
- [ ] Radios do not repeat the group name in their own announcement (each says only its own text).

### 2.5 Required and invalid

- [ ] `required` group, nothing checked, Tab in. Expect: "Size, radio group, required".
- [ ] Submit the form with nothing checked. Expect: "invalid entry" and the validation message
      announced on focus.
- [ ] Check a radio. Expect: "invalid" is gone.

## 3. Result

For each run (A, B, C) record:

| Section | Pass | Fail | Notes |
| --- | --- | --- | --- |
| 1.1 Reaching the control | | | |
| 1.2 Open and close | | | |
| 1.3 Moving | | | |
| 1.4 Choosing | | | |
| 1.5 Typeahead | | | |
| 1.6 Disabled option | | | |
| 1.7 Required and invalid | | | |
| 1.8 Label from the slot | | | |
| 2.1 Entering the group | | | |
| 2.2 Arrow keys | | | |
| 2.3 Disabled radio | | | |
| 2.4 Group name | | | |
| 2.5 Required and invalid | | | |

A failed row is a bug against the component only when the same key sequence is announced correctly
by the equivalent native control (`<select>`, `<input type="radio">`) on the same reader and browser.
If native also differs, record it as a reader quirk and do not change the component.
