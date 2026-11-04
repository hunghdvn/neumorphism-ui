import { buttonDef } from './components/button/button.def.js';
import { buttonGroupDef } from './components/button-group/button-group.def.js';
import { dividerDef } from './components/divider/divider.def.js';
import { iconDef } from './components/icon/icon.def.js';
import { iconButtonDef } from './components/icon-button/icon-button.def.js';
import { surfaceDef } from './components/surface/surface.def.js';
import { switchDef } from './components/switch/switch.def.js';
import { textFieldDef } from './components/text-field/text-field.def.js';
import type { ComponentDef } from './core/define.js';
import { parseProps } from './core/props.js';

export type { ComponentDef, ComponentDocs, DocEntry, FormDef } from './core/define.js';
export { formDefaultProp } from './core/define.js';
export type { InferProps, PropDecl, PropsSchema, PropValue } from './core/props.js';
export {
  attributeName,
  coerceProperty,
  parseAttribute,
  parseProps,
  serializeAttribute,
} from './core/props.js';

/** Every component definition by tag. DOM-free: safe to import in Node. */
export const definitions: ReadonlyMap<string, ComponentDef> = /* @__PURE__ */ new Map<
  string,
  ComponentDef
>([
  [buttonDef.tag, buttonDef],
  [buttonGroupDef.tag, buttonGroupDef],
  [dividerDef.tag, dividerDef],
  [iconDef.tag, iconDef],
  [iconButtonDef.tag, iconButtonDef],
  [surfaceDef.tag, surfaceDef],
  [switchDef.tag, switchDef],
  [textFieldDef.tag, textFieldDef],
]);

/** Inner HTML of a declarative shadow root: inline styles, then the template. */
export function renderShadowContents(
  def: ComponentDef,
  attrs: Readonly<Record<string, string>>,
): string {
  const props = parseProps(def.props, (name) => (Object.hasOwn(attrs, name) ? attrs[name]! : null));
  return `<style data-neu-ssr>${def.styles}</style>${def.template(props).value}`;
}

/** The `<template shadowrootmode>` for one element, or '' for tags this library does not own. */
export function renderDSD(tag: string, attrs: Readonly<Record<string, string>>): string {
  const def = definitions.get(tag.toLowerCase());
  if (!def) return '';
  const delegates = def.delegatesFocus ? ' shadowrootdelegatesfocus' : '';
  return `<template shadowrootmode="open"${delegates}>${renderShadowContents(def, attrs)}</template>`;
}
