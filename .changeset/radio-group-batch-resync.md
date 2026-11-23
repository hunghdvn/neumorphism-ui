---
'@neumorphism-ui/elements': patch
---

`neu-radio-group` resyncs once per batch of inserted radios instead of once per radio, so rendering many radios at once is no longer quadratic.
