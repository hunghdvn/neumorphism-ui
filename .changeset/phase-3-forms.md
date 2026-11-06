---
'@neumorphism-ui/elements': minor
'@neumorphism-ui/tokens': minor
'@neumorphism-ui/ssr': minor
'@neumorphism-ui/react': minor
---

Phase 3: neu-textarea, neu-number-field, neu-checkbox, neu-radio-group and neu-radio, neu-slider,
neu-select and neu-option; the selected label of a select is server-rendered by transformHtml and
the React wrapper. `decodeEntities` (and so `transformHtml`) now decodes every named character
reference of the HTML standard the way the browser does, legacy ones without a semicolon included;
pass `true` as its second argument for an attribute value.
