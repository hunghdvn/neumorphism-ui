import { renderDSD } from '@neu-ui/elements/ssr.js';
import { expect, test } from 'vitest';
import neuUiNitroPlugin from './server-plugin.js';

test('render:html transforms the body and the teleported chunks around it', () => {
  type Context = { body: string[]; bodyPrepend: string[]; bodyAppend: string[]; head: string[] };
  let hook: ((html: Context) => void) | undefined;
  neuUiNitroPlugin({
    hooks: {
      hook: (name, fn) => {
        expect(name).toBe('render:html');
        hook = fn as (html: Context) => void;
      },
    },
  });
  const field = '<neu-text-field label="A"></neu-text-field>';
  const dsd = renderDSD('neu-text-field', { label: 'A' });
  const transformed = `<neu-text-field label="A">${dsd}</neu-text-field>`;
  const html: Context = {
    head: [field],
    bodyPrepend: [`<div id="modal">${field}</div>`],
    body: [`<main>${field}</main>`],
    bodyAppend: [field],
  };
  hook!(html);
  expect(html).toEqual({
    head: [field],
    bodyPrepend: [`<div id="modal">${transformed}</div>`],
    body: [`<main>${transformed}</main>`],
    bodyAppend: [transformed],
  });
});
