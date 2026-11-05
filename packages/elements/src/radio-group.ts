// A group is unusable without its radios (tokens hide undefined neu-radio), so define both.
import './radio.js';
import { NeuRadioGroup } from './components/radio-group/radio-group.js';

NeuRadioGroup.define();

export { NeuRadioGroup };
export { radioGroupDef } from './components/radio-group/radio-group.def.js';
