import { describe, expect, test } from 'vitest';
import { componentDocs } from './docs.js';
import { definitions } from './ssr.js';

describe('component docs', () => {
  test('every definition has docs', () => {
    expect([...componentDocs.keys()].sort()).toEqual([...definitions.keys()].sort());
  });

  // Task 4 fills the content and turns these into real tests: descriptions must cover exactly the
  // props, the keys of def.properties and formDefaultProp(def), each non-empty and not 'TODO'.
  test.todo('descriptions cover exactly the props and JS-only properties');

  // Task 4: keyboard.length > 0 exactly for neu-button, neu-icon-button, neu-number-field,
  // neu-checkbox, neu-radio-group, neu-switch, neu-slider and neu-select.
  test.todo('keyboard is documented where spec §7 lists keys');
});
