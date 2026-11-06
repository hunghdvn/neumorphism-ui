import { describe, expect, test } from 'vitest';
import { componentDocs } from './docs.js';
import { definitions, formDefaultProp } from './ssr.js';

describe('component docs', () => {
  test('every definition has docs', () => {
    expect([...componentDocs.keys()].sort()).toEqual([...definitions.keys()].sort());
  });

  test('descriptions cover exactly the props and JS-only properties', () => {
    for (const [tag, def] of definitions) {
      const docs = componentDocs.get(tag)!;
      const defaultProp = formDefaultProp(def);
      const expected = [
        ...Object.keys(def.props),
        ...Object.keys(def.properties ?? {}),
        ...(defaultProp ? [defaultProp] : []),
      ].sort();
      expect(Object.keys(docs.descriptions).sort(), tag).toEqual(expected);
      for (const [key, text] of Object.entries(docs.descriptions)) {
        expect(text.trim(), `${tag} ${key}`).not.toBe('');
        expect(text, `${tag} ${key}`).not.toBe('TODO');
      }
    }
  });

  test('keyboard is documented where spec §7 lists keys', () => {
    const withKeys = [
      'neu-button',
      'neu-icon-button',
      'neu-number-field',
      'neu-checkbox',
      'neu-radio-group',
      'neu-switch',
      'neu-slider',
      'neu-select',
    ];
    for (const [tag, docs] of componentDocs) {
      expect(docs.keyboard.length > 0, tag).toBe(withKeys.includes(tag));
    }
  });
});
