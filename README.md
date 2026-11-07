# neumorphism-ui

[![npm](https://img.shields.io/npm/v/@neumorphism-ui/elements/next?label=%40neumorphism-ui%2Felements)](https://www.npmjs.com/package/@neumorphism-ui/elements)
[![CI](https://github.com/hunghdvn/neumorphism-ui/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hunghdvn/neumorphism-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Docs: https://hunghdvn.github.io/neumorphism-ui/

Neumorphic UI components built as standard Custom Elements. They work with any framework or none,
render on the server with declarative shadow DOM, and take part in native `<form>`s.

> **Pre-release.** While v1 is being built, `1.0.0-next.x` versions are published under the `next`
> tag, and APIs may still change before `1.0.0`.

## Highlights

- **No runtime dependencies.** Vanilla Custom Elements, shipped as ES modules.
- **Works anywhere.** Plain HTML, Vue, Svelte, Angular and others use the elements directly; React
  18.3 and 19 get generated wrappers.
- **Native forms.** Form controls are form-associated through `ElementInternals`, so they submit,
  reset and report validity like built-in inputs.
- **Server rendering.** Components render as declarative shadow DOM, so they look right before
  JavaScript loads. Next.js App Router streaming works, and a Nuxt module is included.
- **Accessible.** Roles and states sit on the host, keyboard behaviour matches native controls, and
  every component is checked with axe in the test suite.
- **Themeable.** Light and dark themes are CSS custom properties inside `@layer neu`, so your own
  CSS always wins.
- **Small.** CI enforces min+gzip budgets: the shared core ≤ 4 KB, each component ≤ 3 KB
  (`neu-select` 5 KB) without the core and the shared modules (≤ 3 KB), and the whole CDN bundle ≤ 25 KB.

## Packages

| Package                                         | Contents                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`@neumorphism-ui/elements`](packages/elements) | The `<neu-*>` custom elements, one module per tag, plus a one-file CDN bundle                        |
| [`@neumorphism-ui/tokens`](packages/tokens)     | Theme CSS: light and dark custom properties, plus placeholders shown before the elements are defined |
| [`@neumorphism-ui/react`](packages/react)       | React 18.3 / 19 components that render declarative shadow roots on the server                        |
| [`@neumorphism-ui/ssr`](packages/ssr)           | `transformHtml` and `renderDSD` for any server, plus a Nuxt module                                   |

## Components

| Element              | React            | Description                                                                                        |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `<neu-button>`       | `NeuButton`      | Button: `default`, `primary` or `flat` variant, three sizes, loading state, `submit`/`reset` types |
| `<neu-icon-button>`  | `NeuIconButton`  | Icon-only button with a required accessible label                                                  |
| `<neu-button-group>` | `NeuButtonGroup` | Joins buttons into one raised control, horizontal or vertical                                      |
| `<neu-switch>`       | `NeuSwitch`      | Form-associated on/off switch                                                                      |
| `<neu-text-field>`   | `NeuTextField`   | Form-associated text input with label, help text and validation                                    |
| `<neu-icon>`         | `NeuIcon`        | Built-in `system` icons, or your own through `registerIconLibrary`                                 |
| `<neu-surface>`      | `NeuSurface`     | Panel: raised, inset, flat, convex or concave                                                      |
| `<neu-divider>`      | `NeuDivider`     | Engraved horizontal or vertical line                                                               |
| `<neu-badge>`        | `NeuBadge`       | Status label: neutral, accent, success, warning or danger                                          |
| `<neu-avatar>`       | `NeuAvatar`      | Picture, with initials or an icon as fallback                                                      |
| `<neu-spinner>`      | `NeuSpinner`     | Loading indicator that screen readers announce                                                     |
| `<neu-textarea>`     | `NeuTextarea`    | Form-associated multi-line input that can grow with its content                                    |
| `<neu-number-field>` | `NeuNumberField` | Form-associated number input with stepper buttons, min, max and step                               |
| `<neu-checkbox>`     | `NeuCheckbox`    | Form-associated checkbox with an indeterminate state                                               |
| `<neu-radio-group>`  | `NeuRadioGroup`  | Form-associated group of radios with one value and arrow-key navigation                            |
| `<neu-radio>`        | `NeuRadio`       | One choice inside a radio group                                                                    |
| `<neu-slider>`       | `NeuSlider`      | Form-associated horizontal slider for a number                                                     |
| `<neu-select>`       | `NeuSelect`      | Form-associated select with a popover listbox; the selected label is server-rendered               |
| `<neu-option>`       | `NeuOption`      | One choice of a select, written as a child element                                                 |

The v1 component set is complete. Phase 4 is the documentation site.

## Quick start

### With a bundler

```sh
npm install @neumorphism-ui/elements@next @neumorphism-ui/tokens@next
```

```js
import '@neumorphism-ui/tokens/neu.css';
import '@neumorphism-ui/elements/all.js'; // or one tag at a time: '@neumorphism-ui/elements/button.js'
```

```html
<form>
  <neu-text-field label="Email" type="email" name="email" required></neu-text-field>
  <neu-switch name="updates" checked>Email me updates</neu-switch>
  <neu-button type="submit" variant="primary">Subscribe</neu-button>
</form>
```

### From a CDN

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@neumorphism-ui/tokens@1.0.0-next.4/neu.css"
  integrity="sha384-ZO0aY5pvfYCq8aInHo5CqaKrG0o0+pd91Ex/YBRLnjKWe3pOiVO6rNPKQLwGPfwS"
  crossorigin="anonymous"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@neumorphism-ui/elements@1.0.0-next.4/cdn/neu.min.js"
  integrity="sha384-DiDBee0Ugd7uameYNtrmn80+MJNitRUQ9CHZIpUTsFww58fsijVckD0eemz5fQtC"
  crossorigin="anonymous"
></script>
```

`cdn/neu.min.js` is a single minified ES module that defines every component. Pin an exact
version as shown: the `integrity` hash only matches that version's file, and an unpinned URL
cannot be protected this way.

### React and Next.js

```sh
npm install @neumorphism-ui/react@next @neumorphism-ui/tokens@next
```

```tsx
import '@neumorphism-ui/tokens/neu.css';
import { NeuButton, NeuTextField } from '@neumorphism-ui/react';

export function Subscribe() {
  return (
    <form>
      <NeuTextField label="Email" type="email" name="email" required />
      <NeuButton type="submit" variant="primary">
        Subscribe
      </NeuButton>
    </form>
  );
}
```

The wrappers set props as element properties, forward refs to the real element, and work controlled
or uncontrolled like React's `<input>`. See the [React package](packages/react) for details.

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@neumorphism-ui/ssr/nuxt'],
  css: ['@neumorphism-ui/tokens/neu.css'],
});
```

### Any other server

```ts
import { transformHtml } from '@neumorphism-ui/ssr';

const html = transformHtml('<neu-button variant="primary">Save</neu-button>');
// <neu-button variant="primary"><template shadowrootmode="open">…</template>Save</neu-button>
```

## Theming

Set `data-neu-theme="light"` or `"dark"` on any element to pick a theme for that subtree. Without
it, pages follow `prefers-color-scheme`. Override any token in your own CSS. Include
`[data-neu-theme]`, because the themes set `--neu-bg` and `--neu-accent` on every element that
carries it:

```css
:root,
[data-neu-theme] {
  --neu-accent: #0f9d76;
}
```

Each component also exposes CSS parts (`::part(base)` and others) for finer styling. Parts, slots,
events and CSS custom properties are listed in `@neumorphism-ui/elements/custom-elements.json`.

## Browser support

Chrome and Edge 125+, Safari 17.4+, Firefox 126+. No polyfills are needed or shipped. Every
component is tested in Chromium, Firefox and WebKit.

## Development

You need Node.js 22.12 or newer (CI uses 24) and pnpm 9 (`corepack enable` picks the pinned
version).

```sh
pnpm install
pnpm exec playwright install chromium firefox webkit
pnpm build
pnpm test
```

| Command                                   | What it does                                                |
| ----------------------------------------- | ----------------------------------------------------------- |
| `pnpm test`                               | Unit and component tests in Chromium, Firefox and WebKit    |
| `pnpm lint`                               | ESLint and Prettier                                         |
| `pnpm typecheck`                          | TypeScript across all packages                              |
| `pnpm size`                               | Checks the min+gzip size budgets                            |
| `pnpm gen`                                | Regenerates the React wrappers from the element definitions |
| `pnpm test:visual`                        | Visual regression screenshots                               |
| `pnpm test:ssr:prod`, `pnpm test:ssr:dev` | SSR end-to-end tests against the Next.js and Nuxt examples  |

```text
packages/elements   custom elements: one folder per component (.def.ts, .ts, .styles.ts, .test.ts)
packages/tokens     theme CSS
packages/react      React wrappers (src/generated is written by tools/gen)
packages/ssr        transformHtml, renderDSD and the Nuxt module
tools/gen           generator for the React wrappers and the custom elements manifest
apps/examples       Next.js and Nuxt apps used by the SSR end-to-end tests
e2e                 Playwright suites for SSR and visual regression
docs/superpowers    design spec and implementation plans (in Vietnamese)
```

## Contributing

- `main` is protected. Changes land through pull requests that pass the `checks`, `visual` and
  `ssr-gate` CI jobs, with every review thread resolved.
- Add a changeset for any change users will notice: `pnpm changeset`. Releases are automated.
  Changesets keeps a "Version packages" pull request open, and merging it publishes every package to
  npm with provenance.
- Visual baselines depend on the platform. CI compares against the Linux screenshots in
  `e2e/__screenshots__/linux`, which the "Update visual baselines" workflow regenerates.

## License

[MIT](LICENSE) © 2026 HungHD
