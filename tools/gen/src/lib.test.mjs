import { definitions } from '@neumorphism-ui/elements/ssr.js';
import { describe, expect, test } from 'vitest';
import {
  buildManifest,
  buildReactIndex,
  buildReactWrapper,
  eventToReactProp,
  findOrphans,
  propTsType,
  tagToClassName,
  tagToFileBase,
} from './lib.mjs';

const defs = [...definitions.values()];
const switchDef = definitions.get('neu-switch');
const buttonDef = definitions.get('neu-button');
const textFieldDef = definitions.get('neu-text-field');

describe('naming', () => {
  test('tags, files and events map to the expected identifiers', () => {
    expect(tagToClassName('neu-text-field')).toBe('NeuTextField');
    expect(tagToFileBase('neu-text-field')).toBe('text-field');
    expect(eventToReactProp('change')).toBe('onChange');
    expect(eventToReactProp('neu-open')).toBe('onNeuOpen');
  });

  test('prop declarations map to TypeScript types', () => {
    expect(propTsType({ type: 'boolean' })).toBe('boolean');
    expect(propTsType({ type: 'number', default: 1 })).toBe('number');
    expect(propTsType({ type: 'string', values: ['sm', 'md'] })).toBe("'sm' | 'md'");
    expect(propTsType({ type: 'string' })).toBe('string');
  });
});

describe('buildReactWrapper', () => {
  test('a form control gets typed props, a default prop and event props', () => {
    const source = buildReactWrapper(switchDef);
    expect(source.split('\n')[1]).toBe("'use client';");
    expect(source).toContain(
      "import { NeuSwitch as NeuSwitchElement } from '@neumorphism-ui/elements/switch.js';",
    );
    expect(source).toContain('  checked?: boolean;');
    expect(source).toContain('  defaultChecked?: boolean;');
    expect(source).toContain("  size?: 'sm' | 'md' | 'lg';");
    expect(source).toContain('  onChange?: (event: Event) => void;');
    expect(source).toContain("events: { onInput: 'input', onChange: 'change' }");
  });

  test('a value control maps onChange to the input event, like React <input>', () => {
    const source = buildReactWrapper(textFieldDef);
    expect(source).toContain('  onInput?: (event: Event) => void;');
    expect(source).toContain('  onChange?: (event: Event) => void;');
    expect(source).toContain("events: { onInput: 'input', onChange: 'input' }");
    expect(source).not.toContain("'change'");
  });

  test('click stays a native React prop and is not mapped', () => {
    const source = buildReactWrapper(buttonDef);
    expect(source).not.toContain('onClick');
    expect(source).toContain('events: {}');
  });
});

describe('buildManifest', () => {
  test('declares every element with a custom-element-definition export', () => {
    const manifest = buildManifest(defs);
    expect(manifest.schemaVersion).toBe('2.1.0');
    const tags = manifest.modules.map((m) => m.declarations[0].tagName);
    expect(tags).toEqual([
      'neu-avatar',
      'neu-badge',
      'neu-button',
      'neu-button-group',
      'neu-divider',
      'neu-icon',
      'neu-icon-button',
      'neu-spinner',
      'neu-surface',
      'neu-switch',
      'neu-text-field',
    ]);
    for (const mod of manifest.modules) {
      expect(mod.exports.some((e) => e.kind === 'custom-element-definition')).toBe(true);
    }
    const sw = manifest.modules.find((m) => m.declarations[0].tagName === 'neu-switch')
      .declarations[0];
    expect(sw.attributes.find((a) => a.name === 'checked').fieldName).toBe('defaultChecked');
  });
});

test('buildReactIndex re-exports every wrapper', () => {
  expect(buildReactIndex(defs)).toContain(
    "export { NeuTextField, type NeuTextFieldProps } from './text-field.js';",
  );
});

describe('findOrphans', () => {
  test('lists files in generated/ that are not outputs', () => {
    const outputs = new Set(['packages/react/src/generated/index.ts']);
    const found = findOrphans(['index.ts', 'orphan.ts'], 'packages/react/src/generated', outputs);
    expect(found).toEqual(['packages/react/src/generated/orphan.ts']);
  });
});
