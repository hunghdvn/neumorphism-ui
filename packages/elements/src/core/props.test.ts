import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  attributeName,
  coerceProperty,
  parseAttribute,
  parseProps,
  reflects,
  serializeAttribute,
  type PropDecl,
} from './props.js';

const size = {
  type: 'string',
  default: 'md',
  values: ['sm', 'md', 'lg'],
} as const satisfies PropDecl;
const label = { type: 'string' } as const satisfies PropDecl;
const max = { type: 'number', default: 100 } as const satisfies PropDecl;
const disabled = { type: 'boolean' } as const satisfies PropDecl;

// @ts-expect-error values requires a default
export const enumWithoutDefault = { type: 'string', values: ['a', 'b'] } satisfies PropDecl;

describe('attributeName', () => {
  test('converts camelCase to kebab-case', () => {
    expect(attributeName('helpText', label)).toBe('help-text');
  });

  test('honours an explicit attribute name', () => {
    expect(
      attributeName('maxLength', { type: 'number', default: -1, attribute: 'maxlength' }),
    ).toBe('maxlength');
  });
});

describe('parseAttribute', () => {
  test('boolean: presence means true, even for "false"', () => {
    expect(parseAttribute(disabled, null)).toBe(false);
    expect(parseAttribute(disabled, '')).toBe(true);
    expect(parseAttribute(disabled, 'false')).toBe(true);
  });

  test('number: invalid, empty or non-finite input falls back to the default', () => {
    expect(parseAttribute(max, '42')).toBe(42);
    expect(parseAttribute(max, ' ')).toBe(100);
    expect(parseAttribute(max, 'abc')).toBe(100);
    expect(parseAttribute(max, 'Infinity')).toBe(100);
    expect(parseAttribute(max, null)).toBe(100);
  });

  test('string with values: anything outside the list falls back to the default', () => {
    expect(parseAttribute(size, 'lg')).toBe('lg');
    expect(parseAttribute(size, 'huge')).toBe('md');
    expect(parseAttribute(size, 'LG')).toBe('md');
    expect(parseAttribute(size, null)).toBe('md');
  });

  test('string without a default falls back to the empty string', () => {
    expect(parseAttribute(label, null)).toBe('');
    expect(parseAttribute(label, 'Name')).toBe('Name');
  });
});

describe('coerceProperty', () => {
  test('boolean uses truthiness', () => {
    expect(coerceProperty(disabled, 1)).toBe(true);
    expect(coerceProperty(disabled, '')).toBe(false);
    expect(coerceProperty(disabled, undefined)).toBe(false);
  });

  test('number accepts numbers and numeric strings', () => {
    expect(coerceProperty(max, 7)).toBe(7);
    expect(coerceProperty(max, '8')).toBe(8);
    expect(coerceProperty(max, Number.NaN)).toBe(100);
    expect(coerceProperty(max, null)).toBe(100);
  });

  test('string validates against values and maps nullish to the default', () => {
    expect(coerceProperty(size, 'sm')).toBe('sm');
    expect(coerceProperty(size, 'xl')).toBe('md');
    expect(coerceProperty(size, undefined)).toBe('md');
    expect(coerceProperty(label, 5)).toBe('5');
  });
});

describe('serializeAttribute', () => {
  test('boolean false and the empty string mean "remove the attribute"', () => {
    expect(serializeAttribute(disabled, true)).toBe('');
    expect(serializeAttribute(disabled, false)).toBeNull();
    expect(serializeAttribute(label, '')).toBeNull();
  });

  test('numbers and strings are stringified', () => {
    expect(serializeAttribute(max, 3)).toBe('3');
    expect(serializeAttribute(size, 'lg')).toBe('lg');
  });
});

describe('serializeAttribute edge cases', () => {
  test('serializeAttribute removes the attribute for non-finite numbers', () => {
    expect(serializeAttribute({ type: 'number', default: NaN }, NaN)).toBeNull();
    expect(serializeAttribute({ type: 'number', default: 0 }, Infinity)).toBeNull();
    expect(serializeAttribute({ type: 'number', default: 0 }, 0.1)).toBe('0.1');
  });
});

describe('reflects', () => {
  test('is true unless the prop opts out or is the form value prop', () => {
    const form = { form: { valueProp: 'value' } };
    expect(reflects('label', label, {})).toBe(true);
    expect(reflects('label', { type: 'string', reflect: false }, {})).toBe(false);
    expect(reflects('value', label, form)).toBe(false);
    expect(reflects('value', { type: 'string', reflect: true }, form)).toBe(true);
    expect(reflects('name', label, form)).toBe(true);
  });
});

describe('parseProps', () => {
  test('reads every declared prop through its attribute name', () => {
    const schema = { size, helpText: label, max, disabled } as const;
    const attrs: Record<string, string> = { size: 'sm', 'help-text': 'Hi', disabled: '' };
    const props = parseProps(schema, (name) => attrs[name] ?? null);
    expect(props).toEqual({ size: 'sm', helpText: 'Hi', max: 100, disabled: true });
    expectTypeOf(props).toEqualTypeOf<{
      size: 'sm' | 'md' | 'lg';
      helpText: string;
      max: number;
      disabled: boolean;
    }>();
  });
});
