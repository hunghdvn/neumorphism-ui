import { NeuSwitch as NeuSwitchElement } from '@neu-ui/elements/switch.js';
import type { NeuTextField as NeuTextFieldElement } from '@neu-ui/elements/text-field.js';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NeuButton, NeuSwitch, NeuTextField } from './index.js';

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
    // Chromium selects the whole value on focus, which typing would replace; put the caret at the end.
    el.setSelectionRange(1, 1);
    await userEvent.keyboard('b');
    await tick();
  });
  expect(el.value).toBe('AB');
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
