---
'@neumorphism-ui/elements': patch
---

`neu-button-group` fixes:

- A `neu-button` or `neu-icon-button` nested inside another element in the group (a wrapper `<span>`, a menu) keeps its own shadow and corners. Before, it lost them, because the group's merge styles leaked into everything below a slotted child. Only direct `neu-button` and `neu-icon-button` children merge into the group, as documented; a button inside a wrapper now shows as a standalone button.
- A `neu-icon-button` stretches to the height of a taller neighbour (or, in a vertical group, to the group's width) instead of staying at its own size. It never shrinks below its size.
