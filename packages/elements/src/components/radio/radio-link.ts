/** How a radio and its group talk. Symbol.for: two copies of the library on one page agree. */
export const SET_CHECKED = Symbol.for('neu-ui.radio.setChecked');
export const SET_GROUP_DISABLED = Symbol.for('neu-ui.radio.setGroupDisabled');
/** Implemented by neu-radio-group: radios ask for a resync when they upgrade or move in. */
export const RESYNC = Symbol.for('neu-ui.radioGroup.resync');

/** The part of a neu-radio its group uses; absent on a radio that is not upgraded yet. */
export interface RadioLink extends HTMLElement {
  disabled: boolean;
  [SET_CHECKED]?(on: boolean): void;
  [SET_GROUP_DISABLED]?(off: boolean): void;
}
