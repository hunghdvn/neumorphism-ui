# @neu-ui/elements

Framework-agnostic neumorphism web components for
[neumorphism-ui](https://github.com/hunghdvn/neumorphism-ui): `<neu-button>`, `<neu-switch>` and
`<neu-text-field>`. They are form-associated and accessible, and they adopt server-rendered
declarative shadow roots. Import one tag per module (`button.js`, `switch.js`, `text-field.js`)
or all of them with `all.js`; `cdn/neu.min.js` is a single minified bundle. Pre-release.

```sh
npm install @neu-ui/elements@next @neu-ui/tokens@next
```

```js
import '@neu-ui/tokens/neu.css';
import '@neu-ui/elements/all.js';
```

```html
<neu-text-field label="Email" type="email" name="email" required></neu-text-field>
<neu-switch name="notify" checked>Notifications</neu-switch>
<neu-button type="submit" variant="primary">Save</neu-button>
```

MIT licensed.
