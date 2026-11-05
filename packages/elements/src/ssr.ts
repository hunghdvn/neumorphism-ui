import { avatarDef } from './components/avatar/avatar.def.js';
import { badgeDef } from './components/badge/badge.def.js';
import { buttonDef } from './components/button/button.def.js';
import { buttonGroupDef } from './components/button-group/button-group.def.js';
import { checkboxDef } from './components/checkbox/checkbox.def.js';
import { dividerDef } from './components/divider/divider.def.js';
import { iconDef } from './components/icon/icon.def.js';
import { iconButtonDef } from './components/icon-button/icon-button.def.js';
import { numberFieldDef } from './components/number-field/number-field.def.js';
import { optionDef } from './components/option/option.def.js';
import { radioDef } from './components/radio/radio.def.js';
import { radioGroupDef } from './components/radio-group/radio-group.def.js';
import { selectDef } from './components/select/select.def.js';
import { sliderDef } from './components/slider/slider.def.js';
import { spinnerDef } from './components/spinner/spinner.def.js';
import { surfaceDef } from './components/surface/surface.def.js';
import { switchDef } from './components/switch/switch.def.js';
import { textFieldDef } from './components/text-field/text-field.def.js';
import { textareaDef } from './components/textarea/textarea.def.js';
import type { ComponentDef, TemplateContext } from './core/define.js';
import { parseProps } from './core/props.js';

export type {
  ComponentDef,
  ComponentDocs,
  DocEntry,
  FormDef,
  OptionData,
  TemplateContext,
} from './core/define.js';
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
  [avatarDef.tag, avatarDef],
  [badgeDef.tag, badgeDef],
  [buttonDef.tag, buttonDef],
  [buttonGroupDef.tag, buttonGroupDef],
  [checkboxDef.tag, checkboxDef],
  [dividerDef.tag, dividerDef],
  [iconDef.tag, iconDef],
  [iconButtonDef.tag, iconButtonDef],
  [numberFieldDef.tag, numberFieldDef],
  [optionDef.tag, optionDef],
  [radioDef.tag, radioDef],
  [radioGroupDef.tag, radioGroupDef],
  [selectDef.tag, selectDef],
  [sliderDef.tag, sliderDef],
  [spinnerDef.tag, spinnerDef],
  [surfaceDef.tag, surfaceDef],
  [switchDef.tag, switchDef],
  [textFieldDef.tag, textFieldDef],
  [textareaDef.tag, textareaDef],
]);

/** Inner HTML of a declarative shadow root: inline styles, then the template. */
export function renderShadowContents(
  def: ComponentDef,
  attrs: Readonly<Record<string, string>>,
  ctx?: TemplateContext,
): string {
  const props = parseProps(def.props, (name) => (Object.hasOwn(attrs, name) ? attrs[name]! : null));
  return `<style data-neu-ssr>${def.styles}</style>${def.template(props, ctx).value}`;
}

/**
 * The `<template shadowrootmode>` for one element, or '' for tags this library does not own.
 * `ctx` carries what the attributes cannot, such as the options of a select (spec §8.2).
 */
export function renderDSD(
  tag: string,
  attrs: Readonly<Record<string, string>>,
  ctx?: TemplateContext,
): string {
  const def = definitions.get(tag.toLowerCase());
  if (!def) return '';
  const delegates = def.delegatesFocus ? ' shadowrootdelegatesfocus' : '';
  return `<template shadowrootmode="open"${delegates}>${renderShadowContents(def, attrs, ctx)}</template>`;
}
