# @neumorphism-ui/ssr

Server-side rendering helpers for [neumorphism-ui](https://github.com/hunghdvn/neumorphism-ui).
`transformHtml` inserts a declarative shadow root into every `<neu-*>` element of rendered HTML, so
the components look right before (or without) JavaScript; `renderDSD` renders one element's shadow
root; `@neumorphism-ui/ssr/nuxt` is a Nuxt module that does this for Nuxt pages and loads the element
definitions on the client. Pre-release.

```sh
npm install @neumorphism-ui/ssr@next @neumorphism-ui/elements@next @neumorphism-ui/tokens@next
```

```ts
import { transformHtml } from '@neumorphism-ui/ssr';

const html = transformHtml('<neu-button variant="primary">Save</neu-button>');
// <neu-button variant="primary"><template shadowrootmode="open">…</template>Save</neu-button>
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({ modules: ['@neumorphism-ui/ssr/nuxt'], css: ['@neumorphism-ui/tokens/neu.css'] });
```

## Limitations

- In attribute values, `transformHtml` decodes only `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`,
  `&nbsp;` and numeric references. Other named references such as `&eacute;` are rendered literally
  until the page hydrates. Output from React, Vue and similar renderers is unaffected, since they
  emit UTF-8 characters and escape only `& < > " '`; write UTF-8 in hand-written HTML too.
- Nuxt's experimental SSR streaming (`experimental.ssrStreaming`) bypasses the `render:html` hook,
  so streamed pages get no declarative shadow roots.

MIT licensed.
