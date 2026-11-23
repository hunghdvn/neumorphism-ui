---
'@neumorphism-ui/elements': patch
---

A server-rendered component that gets defined while the page is still streaming (an `async` module script, a dynamic `import()`) now waits for the parser to move past it before adopting its declarative shadow root. Before, it could adopt a root whose last text was still arriving, and that text then appeared twice (for example a field's error text).
