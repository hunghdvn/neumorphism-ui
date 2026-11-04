// Type-only checks, run by `pnpm typecheck`. Never executed.
import * as React from 'react';
import { NeuButton, NeuSwitch, NeuTextField } from '../src/index.js';

const h = React.createElement;

h(NeuSwitch, { checked: true, size: 'sm', onChange: (event: Event) => void event });
h(NeuButton, { variant: 'primary', type: 'submit', onClick: () => undefined });
h(NeuTextField, { label: 'Email', type: 'email', defaultValue: 'a', maxLength: 10 });

// @ts-expect-error size only accepts sm | md | lg
h(NeuSwitch, { size: 'xl' });
// @ts-expect-error variant is a closed set
h(NeuButton, { variant: 'danger' });
// @ts-expect-error checked must be a boolean
h(NeuSwitch, { checked: 'yes' });
