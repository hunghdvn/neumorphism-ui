import { fileURLToPath } from 'node:url';
import { addPluginTemplate, addServerPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { NuxtModule } from '@nuxt/schema';

/**
 * Registers neu-* tags as custom elements for Vue, injects declarative shadow roots into
 * server-rendered HTML, and loads the element definitions on the client. Nuxt's experimental
 * SSR streaming bypasses render:html and is not supported in v1.
 */
const neuUiModule: NuxtModule = defineNuxtModule({
  meta: { name: '@neu-ui/ssr', configKey: 'neuUi' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    const previous = nuxt.options.vue.compilerOptions.isCustomElement;
    nuxt.options.vue.compilerOptions.isCustomElement = (tag: string) =>
      tag.startsWith('neu-') || (previous?.(tag) ?? false);

    addServerPlugin(resolve('./runtime/server-plugin.js'));

    // Resolved from this package, so it works even when the app does not list @neu-ui/elements.
    const elements = fileURLToPath(import.meta.resolve('@neu-ui/elements/all.js'));
    addPluginTemplate({
      filename: 'neu-ui.client.mjs',
      mode: 'client',
      getContents: () =>
        [
          "import { defineNuxtPlugin } from '#app/nuxt';",
          `import ${JSON.stringify(elements)};`,
          'export default defineNuxtPlugin(() => {});',
          '',
        ].join('\n'),
    });
  },
});

export default neuUiModule;
