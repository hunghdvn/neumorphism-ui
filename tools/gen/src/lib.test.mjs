import { componentDocs } from '@neumorphism-ui/elements/docs.js';
import { definitions, formDefaultProp } from '@neumorphism-ui/elements/ssr.js';
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
const docsOf = (def) => componentDocs.get(def.tag);
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
    const source = buildReactWrapper(switchDef, docsOf(switchDef));
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
    const source = buildReactWrapper(textFieldDef, docsOf(textFieldDef));
    expect(source).toContain('  onInput?: (event: Event) => void;');
    expect(source).toContain('  onChange?: (event: Event) => void;');
    expect(source).toContain("events: { onInput: 'input', onChange: 'input' }");
    expect(source).not.toContain("'change'");
  });

  test('JS-only properties reach the wrapper and the manifest; defaultValue follows the value prop type', () => {
    const slider = definitions.get('neu-slider');
    const source = buildReactWrapper(slider, docsOf(slider));
    expect(source).toContain('  valueFormatter?: (value: number) => string;');
    expect(source).toContain('  defaultValue?: number;');
    expect(source).not.toContain('defaultValue?: string');
    expect(buildReactWrapper(textFieldDef, docsOf(textFieldDef))).toContain(
      '  defaultValue?: string;',
    );
    const declaration = buildManifest([slider], componentDocs).modules[0].declarations[0];
    expect(declaration.members).toContainEqual(
      expect.objectContaining({
        kind: 'field',
        name: 'valueFormatter',
        type: { text: '(value: number) => string' },
      }),
    );
    expect(declaration.members.find((m) => m.name === 'defaultValue').type).toEqual({
      text: 'number',
    });
    const text = buildManifest([textFieldDef], componentDocs).modules[0].declarations[0];
    expect(text.members.find((m) => m.name === 'defaultValue').type).toEqual({ text: 'string' });
  });

  test('the manifest reflects every prop except the live value and opt-outs', () => {
    const members = (def) => buildManifest([def], componentDocs).modules[0].declarations[0].members;
    const field = (def, name) => members(def).find((m) => m.name === name);
    expect(field(textFieldDef, 'label').reflects).toBe(true);
    expect(field(textFieldDef, 'name').reflects).toBe(true);
    expect(field(textFieldDef, 'value').reflects).toBeUndefined();
    expect(field(definitions.get('neu-checkbox'), 'indeterminate').reflects).toBe(false);
    expect(field(definitions.get('neu-checkbox'), 'value').reflects).toBe(true);
  });

  test('descriptions follow ruling P-2: the attribute row describes the default', () => {
    const stub = (def) => {
      const keys = [
        ...Object.keys(def.props),
        ...Object.keys(def.properties ?? {}),
        ...(formDefaultProp(def) ? [formDefaultProp(def)] : []),
      ];
      return new Map([
        [
          def.tag,
          {
            ...docsOf(def),
            descriptions: Object.fromEntries(keys.map((key) => [key, `description of ${key}`])),
          },
        ],
      ]);
    };
    const declaration = (def) => buildManifest([def], stub(def)).modules[0].declarations[0];
    const text = declaration(textFieldDef);
    expect(text.attributes.find((a) => a.name === 'value').description).toBe(
      'description of defaultValue',
    );
    expect(text.attributes.find((a) => a.name === 'label').description).toBe(
      'description of label',
    );
    expect(text.members.find((m) => m.name === 'value').description).toBe('description of value');
    expect(text.members.find((m) => m.name === 'defaultValue').description).toBe(
      'description of defaultValue',
    );
    expect(text.members.find((m) => m.name === 'label').description).toBe('description of label');
    const sw = declaration(switchDef);
    expect(sw.attributes.find((a) => a.name === 'checked').description).toBe(
      'description of defaultChecked',
    );
    expect(sw.members.find((m) => m.name === 'checked').description).toBe('description of checked');
  });

  test('click stays a native React prop and is not mapped', () => {
    const source = buildReactWrapper(buttonDef, docsOf(buttonDef));
    expect(source).not.toContain('onClick');
    expect(source).toContain('events: {}');
  });
});

describe('buildManifest', () => {
  test('declares every element with a custom-element-definition export', () => {
    const manifest = buildManifest(defs, componentDocs);
    expect(manifest.schemaVersion).toBe('2.1.0');
    const tags = manifest.modules.map((m) => m.declarations[0].tagName);
    expect(tags).toEqual([
      'neu-avatar',
      'neu-badge',
      'neu-button',
      'neu-button-group',
      'neu-checkbox',
      'neu-divider',
      'neu-icon',
      'neu-icon-button',
      'neu-number-field',
      'neu-option',
      'neu-radio',
      'neu-radio-group',
      'neu-select',
      'neu-slider',
      'neu-spinner',
      'neu-surface',
      'neu-switch',
      'neu-text-field',
      'neu-textarea',
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
