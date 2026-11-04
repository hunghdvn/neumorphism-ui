import { expect, test } from 'vitest';

test('every element module can be imported in Node', async () => {
  const mod = await import('@neu-ui/elements/all.js');
  expect(typeof mod.NeuButton).toBe('function');
  expect(typeof mod.NeuSwitch).toBe('function');
  expect(typeof mod.NeuTextField).toBe('function');
});
