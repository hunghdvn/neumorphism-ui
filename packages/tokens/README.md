# @neumorphism-ui/tokens

Theme tokens for [neumorphism-ui](https://github.com/hunghdvn/neumorphism-ui): one CSS file with
the light and dark themes as custom properties (`--neu-bg`, `--neu-accent`, `--neu-distance`,
`--neu-radius`, …) inside `@layer neu`, so your own CSS always wins, plus placeholders that keep
`neu-*` elements sized before their definitions load. Set `data-neu-theme="light"` or `"dark"` to
pick a theme; without it the page follows `prefers-color-scheme`. Pre-release.

```sh
npm install @neumorphism-ui/tokens@next
```

```css
@import '@neumorphism-ui/tokens/neu.css';

:root {
  --neu-accent: #0f9d76;
}
```

MIT licensed.
