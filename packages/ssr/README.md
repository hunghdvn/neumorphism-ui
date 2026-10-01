# @neu-ui/ssr

Server-side rendering helpers for [neumorphism-ui](https://github.com/hunghdvn/neumorphism-ui).
`transformHtml` inserts a declarative shadow root into every `<neu-*>` element of rendered HTML, so
the components look right before (or without) JavaScript; `renderDSD` renders one element's shadow
root; `@neu-ui/ssr/nuxt` is a Nuxt module that does this for Nuxt pages and loads the element
definitions on the client. Pre-release.

```sh
npm install @neu-ui/ssr@next @neu-ui/elements@next @neu-ui/tokens@next
```

```ts
import { transformHtml } from '@neu-ui/ssr';

const html = transformHtml('<neu-button variant="primary">Save</neu-button>');
// <neu-button variant="primary"><template shadowrootmode="open">…</template>Save</neu-button>
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({ modules: ['@neu-ui/ssr/nuxt'], css: ['@neu-ui/tokens/neu.css'] });
```

MIT licensed.
