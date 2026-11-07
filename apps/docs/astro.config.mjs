import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://hunghdvn.github.io',
  base: '/neumorphism-ui',
  integrations: [
    starlight({
      title: 'neumorphism-ui',
      customCss: ['@neumorphism-ui/tokens/neu.css', './src/styles/docs.css'],
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
