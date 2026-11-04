# @neu-ui/react

React 18.3 and 19 wrappers for [neumorphism-ui](https://github.com/hunghdvn/neumorphism-ui):
`NeuButton`, `NeuSwitch`, `NeuTextField`, `NeuIcon`, `NeuIconButton`, `NeuButtonGroup`,
`NeuSurface`, `NeuDivider`, `NeuBadge`, `NeuAvatar` and `NeuSpinner`, generated from the element definitions. They set props
as element properties, forward refs to the real element, work controlled or uncontrolled like
React's `<input>`, and server-render declarative shadow roots, so they work with Next.js App Router
streaming. Pre-release.

```sh
npm install @neu-ui/react@next @neu-ui/tokens@next
```

```tsx
import '@neu-ui/tokens/neu.css';
import { NeuSwitch, NeuTextField } from '@neu-ui/react';

<NeuTextField label="Email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} />;
<NeuSwitch name="notify" defaultChecked>Notifications</NeuSwitch>;
```

## Icon libraries

`NeuIcon` and `NeuIconButton` ship the built-in `system` icons. Register your own library with
`registerIconLibrary`, re-exported here from `@neu-ui/elements` so you need no second import:

```tsx
import { NeuIcon, registerIconLibrary } from '@neu-ui/react';

registerIconLibrary('brand', { resolve: (name) => `/icons/${name}.svg` });

<NeuIcon library="brand" name="logo" label="Acme" />;
```

`system` is reserved; registering a library with that name is ignored.

MIT licensed.
