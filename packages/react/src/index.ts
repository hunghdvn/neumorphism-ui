export * from './generated/index.js';
export { createComponent, type WrapperConfig, type WrapperProps } from './create-component.js';
// Hand-written, Node-safe: lets React apps register icon libraries without a second import path.
export { registerIconLibrary, type IconLibrary } from '@neumorphism-ui/elements/icons.js';
