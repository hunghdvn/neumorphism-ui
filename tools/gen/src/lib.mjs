import { attributeName, formDefaultProp } from '@neumorphism-ui/elements/ssr.js';

const pascal = (text) =>
  text
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const tagToClassName = (tag) => pascal(tag);
export const tagToFileBase = (tag) => tag.replace(/^neu-/, '');
export const eventToReactProp = (event) => `on${pascal(event)}`;

export function propTsType(decl) {
  if (decl.type === 'boolean') return 'boolean';
  if (decl.type === 'number') return 'number';
  return decl.values ? decl.values.map((value) => `'${value}'`).join(' | ') : 'string';
}

function defaultText(decl) {
  if (decl.type === 'boolean') return 'false';
  if (decl.type === 'number') return String(decl.default);
  return `'${decl.default ?? ''}'`;
}

/** The type of `defaultChecked` / `defaultValue`: that of the prop whose attribute holds the default. */
function defaultTsType(def) {
  return propTsType(def.props[def.form.valueProp]);
}

/** Custom Elements Manifest 2.1.0 for IDEs, docs and Storybook-like tools. */
export function buildManifest(defs) {
  return {
    schemaVersion: '2.1.0',
    readme: '',
    modules: defs.map((def) => {
      const name = tagToClassName(def.tag);
      const path = `dist/${tagToFileBase(def.tag)}.js`;
      const valueProp = def.form?.valueProp;
      const defaultProp = formDefaultProp(def);
      const attributes = Object.entries(def.props).map(([key, decl]) => ({
        name: attributeName(key, decl),
        fieldName: key === valueProp ? defaultProp : key,
        type: { text: propTsType(decl) },
        default: defaultText(decl),
      }));
      const members = Object.entries(def.props).map(([key, decl]) =>
        key === valueProp
          ? {
              kind: 'field',
              name: key,
              type: { text: propTsType(decl) },
              description: `Current ${key}. The ${attributeName(key, decl)} attribute holds the default.`,
            }
          : {
              kind: 'field',
              name: key,
              type: { text: propTsType(decl) },
              default: defaultText(decl),
              attribute: attributeName(key, decl),
              reflects: decl.reflect === true,
            },
      );
      if (defaultProp) {
        members.push({
          kind: 'field',
          name: defaultProp,
          type: { text: defaultTsType(def) },
          attribute: valueProp,
          reflects: true,
        });
      }
      for (const [name, type] of Object.entries(def.properties ?? {})) {
        members.push({ kind: 'field', name, type: { text: type } });
      }
      return {
        kind: 'javascript-module',
        path,
        declarations: [
          {
            kind: 'class',
            name,
            tagName: def.tag,
            customElement: true,
            description: def.docs.summary,
            attributes,
            members,
            events: def.docs.events.map((e) => ({
              name: e.name,
              type: { text: 'Event' },
              description: e.description,
            })),
            slots: def.docs.slots.map(({ name: slot, description }) => ({
              name: slot,
              description,
            })),
            cssParts: def.docs.parts.map(({ name: part, description }) => ({
              name: part,
              description,
            })),
            cssProperties: def.docs.cssProperties.map(({ name: prop, description }) => ({
              name: prop,
              description,
            })),
          },
        ],
        exports: [
          { kind: 'js', name, declaration: { name, module: path } },
          { kind: 'custom-element-definition', name: def.tag, declaration: { name, module: path } },
        ],
      };
    }),
  };
}

/**
 * [React prop, DOM event] pairs. click stays a native React prop. A value control follows React's
 * <input>: onChange fires on every edit (the DOM input event); the committed DOM change has no prop.
 */
function reactEvents(def) {
  const valueControl = def.form?.valueProp === 'value';
  return def.docs.events
    .filter((event) => event.name !== 'click')
    .map((event) =>
      valueControl && event.name === 'change'
        ? ['onChange', 'input']
        : [eventToReactProp(event.name), event.name],
    );
}

export function buildReactWrapper(def) {
  const name = tagToClassName(def.tag);
  const file = tagToFileBase(def.tag);
  const defaultProp = formDefaultProp(def);
  const lines = Object.entries(def.props).map(([key, decl]) => `  ${key}?: ${propTsType(decl)};`);
  if (defaultProp) lines.push(`  ${defaultProp}?: ${defaultTsType(def)};`);
  for (const [name, type] of Object.entries(def.properties ?? {})) {
    lines.push(`  ${name}?: ${type};`);
  }
  const events = reactEvents(def);
  for (const [prop] of events) lines.push(`  ${prop}?: (event: Event) => void;`);
  const eventMap = events.map(([prop, event]) => `${prop}: '${event}'`).join(', ');
  return [
    `// Generated by tools/gen from the ${def.tag} definition. Do not edit.`,
    "'use client';",
    `import { ${name} as ${name}Element } from '@neumorphism-ui/elements/${file}.js';`,
    "import { createComponent, type WrapperProps } from '../create-component.js';",
    '',
    `interface ${name}OwnProps {`,
    ...lines,
    '}',
    '',
    `export type ${name}Props = WrapperProps<keyof ${name}OwnProps> & ${name}OwnProps;`,
    '',
    `export const ${name} = createComponent<${name}Props, ${name}Element>(${name}Element, {`,
    `  events: ${eventMap ? `{ ${eventMap} }` : '{}'},`,
    '});',
    '',
  ].join('\n');
}

export function buildReactIndex(defs) {
  const lines = defs.map((def) => {
    const name = tagToClassName(def.tag);
    return `export { ${name}, type ${name}Props } from './${tagToFileBase(def.tag)}.js';`;
  });
  return ['// Generated by tools/gen. Do not edit.', ...lines, ''].join('\n');
}

/** Files found in a generated directory that no output accounts for. */
export function findOrphans(names, dir, outputs) {
  return names.map((name) => `${dir}/${name}`).filter((path) => !outputs.has(path));
}
