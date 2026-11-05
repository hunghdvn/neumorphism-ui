import { renderShadowContents } from '@neu-ui/elements/ssr.js';
import { NeuSwitch as NeuSwitchElement } from '@neu-ui/elements/switch.js';
import type { NeuTextField as NeuTextFieldElement } from '@neu-ui/elements/text-field.js';
import * as React from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, inject, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuButton, NeuSwitch, NeuTextField } from './index.js';

declare module 'vitest' {
  export interface ProvidedContext {
    /** The React major each browser project runs against (vitest.config.ts). */
    reactMajor: number;
  }
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as unknown as { act: (fn: () => void | Promise<void>) => Promise<void> }).act;
const h = React.createElement;
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
});

const render = (node: React.ReactNode) => act(() => root.render(node));

test('runs against the React major its project targets', () => {
  expect(Number.parseInt(React.version, 10)).toBe(inject('reactMajor'));
});

test('hydrates server markup without errors and keeps the server-rendered shadow root', async () => {
  // What the wrapper renders on the server for <NeuSwitch name="n" defaultChecked>Notify</NeuSwitch>.
  const markup =
    '<neu-switch checked="" name="n"><template shadowrootmode="open">' +
    renderShadowContents(NeuSwitchElement.def, { checked: '', name: 'n' }) +
    '</template>Notify</neu-switch>';
  const server = document.createElement('div');
  document.body.append(server);
  server.setHTMLUnsafe(markup);
  const el = server.querySelector('neu-switch') as NeuSwitchElement;
  const track = el.shadowRoot!.querySelector('.track');
  expect(track).not.toBeNull();
  const recoverable: unknown[] = [];
  const errors: unknown[][] = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
  let hydrated: Root | undefined;
  try {
    await act(async () => {
      hydrated = hydrateRoot(server, h(NeuSwitch, { name: 'n', defaultChecked: true }, 'Notify'), {
        onRecoverableError: (error: unknown) => recoverable.push(error),
      });
    });
  } finally {
    spy.mockRestore();
  }
  expect(recoverable).toEqual([]);
  expect(errors).toEqual([]);
  expect(server.querySelector('neu-switch')).toBe(el);
  expect(el.shadowRoot!.querySelector('.track')).toBe(track);
  expect(el.checked).toBe(true);
  await act(() => hydrated!.unmount());
  server.remove();
});

test('renders the element with children, host props and a forwarded ref', async () => {
  const ref = React.createRef<NeuSwitchElement>();
  await render(h(NeuSwitch, { ref, name: 'n', className: 'x', id: 'sw' }, 'Notify'));
  const el = container.querySelector('neu-switch')!;
  expect(ref.current).toBe(el);
  expect(el).toBeInstanceOf(NeuSwitchElement);
  expect(el.textContent).toBe('Notify');
  expect(el.className).toBe('x');
  expect(el.id).toBe('sw');
  expect(el.getAttribute('name')).toBe('n');
});

test('sets definition props as properties, and resets removed ones', async () => {
  await render(h(NeuSwitch, { disabled: true, checked: true }));
  const el = container.querySelector('neu-switch') as NeuSwitchElement;
  expect(el.disabled).toBe(true);
  expect(el.checked).toBe(true);
  await render(h(NeuSwitch, { checked: true }));
  expect(el.disabled).toBe(false);
});

test('uncontrolled: defaultChecked sets the default; onChange receives the DOM event', async () => {
  const seen: boolean[] = [];
  await render(
    h(NeuSwitch, {
      defaultChecked: true,
      onChange: (event: Event) => seen.push((event.target as NeuSwitchElement).checked),
    }),
  );
  const el = container.querySelector('neu-switch') as NeuSwitchElement;
  expect(el.checked).toBe(true);
  expect(el.hasAttribute('checked')).toBe(true);
  await act(async () => {
    el.click();
    await tick();
  });
  expect(seen).toEqual([false]);
  expect(el.checked).toBe(false);
});

test('controlled: follows state, and reverts when the state does not change', async () => {
  function Controlled({ locked }: { locked: boolean }) {
    const [on, setOn] = React.useState(false);
    return h(NeuSwitch, {
      checked: on,
      onChange: () => {
        if (!locked) setOn((value) => !value);
      },
    });
  }
  await render(h(Controlled, { locked: false }));
  const el = container.querySelector('neu-switch') as NeuSwitchElement;
  await act(async () => {
    el.click();
    await tick();
  });
  expect(el.checked).toBe(true);
  await render(h(Controlled, { locked: true }));
  await act(async () => {
    el.click();
    await tick();
  });
  expect(el.checked).toBe(true);
});

test('controlled text field transforms what the user types', async () => {
  function Upper() {
    const [value, setValue] = React.useState('a');
    return h(NeuTextField, {
      label: 'L',
      value: value.toUpperCase(),
      onInput: (event: Event) => setValue((event.target as NeuTextFieldElement).value),
    });
  }
  await render(h(Upper));
  const el = container.querySelector('neu-text-field') as NeuTextFieldElement;
  expect(el.value).toBe('A');
  await act(async () => {
    el.focus();
    // Put the caret at the end so typing appends wherever an engine placed it.
    el.setSelectionRange(1, 1);
    await userEvent.keyboard('b');
    await tick();
  });
  expect(el.value).toBe('AB');
});

test('controlled text field: onChange fires on every keystroke, like React <input>', async () => {
  function Mirror() {
    const [value, setValue] = React.useState('a');
    return h(NeuTextField, {
      label: 'L',
      value,
      onChange: (event: Event) => setValue((event.target as NeuTextFieldElement).value),
    });
  }
  await render(h(Mirror));
  const el = container.querySelector('neu-text-field') as NeuTextFieldElement;
  await act(async () => {
    el.focus();
    // Put the caret at the end so typing appends wherever an engine placed it.
    el.setSelectionRange(1, 1);
    await userEvent.keyboard('b');
    await tick();
  });
  expect(el.value).toBe('ab');
});

test('text field: onInput and onChange both receive each edit, in prop order', async () => {
  const seen: string[] = [];
  await render(
    h(NeuTextField, {
      label: 'L',
      onInput: (event: Event) => seen.push(`input:${event.type}`),
      onChange: (event: Event) => seen.push(`change:${event.type}`),
    }),
  );
  const el = container.querySelector('neu-text-field') as NeuTextFieldElement;
  await act(async () => {
    el.focus();
    await userEvent.keyboard('x');
    await tick();
  });
  expect(seen).toEqual(['input:input', 'change:input']);
});

test('dropping defaultValue removes the default attribute instead of writing "undefined"', async () => {
  await render(h(NeuTextField, { label: 'L', defaultValue: 'a' }));
  const el = container.querySelector('neu-text-field') as NeuTextFieldElement;
  expect(el.value).toBe('a');
  await render(h(NeuTextField, { label: 'L' }));
  expect(el.hasAttribute('value')).toBe(false);
  expect(el.value).toBe('');
});

test('button: React onClick works and type=submit submits the form', async () => {
  let clicks = 0;
  let submits = 0;
  await render(
    h(
      'form',
      {
        onSubmit: (event: React.FormEvent) => {
          event.preventDefault();
          submits++;
        },
      },
      h(NeuButton, { type: 'submit', onClick: () => clicks++ }, 'Go'),
    ),
  );
  await act(async () => {
    (container.querySelector('neu-button') as HTMLElement).click();
  });
  expect([clicks, submits]).toEqual([1, 1]);
});

test.skipIf(inject('reactMajor') < 19)(
  'a React 19 form action runs when a NeuButton submits',
  async () => {
    const seen: Array<FormDataEntryValue | null> = [];
    const action = (data: FormData) => {
      seen.push(data.get('q'));
    };
    await render(
      h(
        'form',
        { action },
        h('input', { name: 'q', defaultValue: 'hello' }),
        h(NeuButton, { type: 'submit' }, 'Go'),
      ),
    );
    await act(async () => {
      (container.querySelector('neu-button') as HTMLElement).click();
    });
    await vi.waitFor(() => expect(seen).toEqual(['hello']));
  },
);
