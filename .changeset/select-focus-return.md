---
'@neumorphism-ui/elements': patch
---

neu-select closes its listbox when focus lands outside it after the window was left while the
listbox was open (Firefox sends no second focusout then).
