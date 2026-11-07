import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://hunghdvn.github.io',
  base: '/neumorphism-ui',
  integrations: [
    starlight({
      title: 'neumorphism-ui',
      customCss: ['@neumorphism-ui/tokens/neu.css', './src/styles/docs.css'],
      sidebar: [
        { label: 'Home', slug: '' },
        { label: 'Getting started', items: [{ slug: 'getting-started/installation' }] },
        {
          label: 'Guides',
          items: ['guides/theming', 'guides/ssr', 'guides/react', 'guides/forms'].map((slug) => ({
            slug,
          })),
        },
        {
          label: 'Components',
          items: [
            'components/button',
            'components/icon-button',
            'components/button-group',
            'components/switch',
            'components/text-field',
            'components/icon',
            'components/surface',
            'components/divider',
            'components/badge',
            'components/avatar',
            'components/spinner',
            'components/textarea',
            'components/number-field',
            'components/checkbox',
            'components/radio-group',
            'components/slider',
            'components/select',
          ].map((slug) => ({ slug })),
        },
      ],
      components: { Head: './src/components/Head.astro' },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/hunghdvn/neumorphism-ui',
        },
      ],
    }),
  ],
});
