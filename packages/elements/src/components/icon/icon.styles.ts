export const iconStyles = `
:host { display: inline-block; inline-size: 1em; block-size: 1em; vertical-align: -0.125em; color: inherit; }
:host(:not(:defined)) { visibility: inherit !important; min-block-size: auto !important; }
:host([hidden]) { display: none !important; }
.box, svg { display: block; inline-size: 100%; block-size: 100%; }
.box { contain: paint; }
`;
