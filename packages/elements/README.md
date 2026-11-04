# @neu-ui/elements

Framework-agnostic neumorphism web components for
[neumorphism-ui](https://github.com/hunghdvn/neumorphism-ui): `<neu-button>`, `<neu-switch>`,
`<neu-text-field>`, `<neu-icon>`, `<neu-icon-button>`, `<neu-button-group>`, `<neu-surface>`,
`<neu-divider>`, `<neu-badge>`, `<neu-avatar>` and `<neu-spinner>`. They are accessible, the form
controls are form-associated, and they adopt server-rendered declarative shadow roots. Import one
tag per module (`button.js`, `icon.js`, `badge.js`, ...) or all of them with `all.js`; `cdn/neu.min.js` is a single minified bundle. Pre-release.

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

```html
<neu-icon-button icon="plus" label="Add"></neu-icon-button>
<neu-button-group label="Actions">
  <neu-button>One</neu-button>
  <neu-button>Two</neu-button>
</neu-button-group>
<neu-surface shape="inset" padding="lg">Content</neu-surface>
<neu-badge variant="success" pill>New</neu-badge>
<neu-avatar initials="HD" label="Hung Do"></neu-avatar>
<neu-spinner size="lg"></neu-spinner>
<neu-divider orientation="vertical"></neu-divider>
```

## Icons

`<neu-icon>` and `<neu-icon-button>` ship eight built-in icons in the `system` library: `check`,
`chevron-down`, `chevron-up`, `plus`, `minus`, `x`, `alert-circle` and `user`. Register your own
library with `registerIconLibrary`:

```js
import { registerIconLibrary } from '@neu-ui/elements/icons.js';

registerIconLibrary('brand', {
  // Return SVG markup, or a URL that serves an SVG.
  resolve: (name) => `/icons/${name}.svg`,
});
```

```html
<neu-icon library="brand" name="logo" label="Acme"></neu-icon>
```

`resolve` returns either SVG markup or a URL. Markup is sanitized with an allowlist: no scripts,
event handlers, animation, `<style>`, `<image>` or `<a>`, and only local `#` hrefs survive.

MIT licensed.
