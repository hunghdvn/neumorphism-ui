import { avatarDocs } from './components/avatar/avatar.docs.js';
import { badgeDocs } from './components/badge/badge.docs.js';
import { buttonDocs } from './components/button/button.docs.js';
import { buttonGroupDocs } from './components/button-group/button-group.docs.js';
import { checkboxDocs } from './components/checkbox/checkbox.docs.js';
import { dividerDocs } from './components/divider/divider.docs.js';
import { iconDocs } from './components/icon/icon.docs.js';
import { iconButtonDocs } from './components/icon-button/icon-button.docs.js';
import { numberFieldDocs } from './components/number-field/number-field.docs.js';
import { optionDocs } from './components/option/option.docs.js';
import { radioDocs } from './components/radio/radio.docs.js';
import { radioGroupDocs } from './components/radio-group/radio-group.docs.js';
import { selectDocs } from './components/select/select.docs.js';
import { sliderDocs } from './components/slider/slider.docs.js';
import { spinnerDocs } from './components/spinner/spinner.docs.js';
import { surfaceDocs } from './components/surface/surface.docs.js';
import { switchDocs } from './components/switch/switch.docs.js';
import { textFieldDocs } from './components/text-field/text-field.docs.js';
import { textareaDocs } from './components/textarea/textarea.docs.js';
import type { ComponentDocs } from './core/define.js';

/** The documentation of every component by tag, for tools. DOM-free; never part of the runtime bundles. */
export const componentDocs: ReadonlyMap<string, ComponentDocs> = new Map<string, ComponentDocs>([
  ['neu-avatar', avatarDocs],
  ['neu-badge', badgeDocs],
  ['neu-button', buttonDocs],
  ['neu-button-group', buttonGroupDocs],
  ['neu-checkbox', checkboxDocs],
  ['neu-divider', dividerDocs],
  ['neu-icon', iconDocs],
  ['neu-icon-button', iconButtonDocs],
  ['neu-number-field', numberFieldDocs],
  ['neu-option', optionDocs],
  ['neu-radio', radioDocs],
  ['neu-radio-group', radioGroupDocs],
  ['neu-select', selectDocs],
  ['neu-slider', sliderDocs],
  ['neu-spinner', spinnerDocs],
  ['neu-surface', surfaceDocs],
  ['neu-switch', switchDocs],
  ['neu-text-field', textFieldDocs],
  ['neu-textarea', textareaDocs],
]);
