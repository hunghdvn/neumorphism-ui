const missing = new Map<string, string>();

/**
 * The browser's own, localised "value missing" message, borrowed once from a required native
 * control: an input of type `kind` ("checkbox", "radio") or, for "select", a select. `fallback`
 * covers a browser that reports none.
 */
export function requiredMessage(kind: 'checkbox' | 'radio' | 'select', fallback: string): string {
  let message = missing.get(kind);
  if (message === undefined) {
    const probe =
      kind === 'select'
        ? document.createElement('select')
        : Object.assign(document.createElement('input'), { type: kind });
    probe.required = true;
    message = probe.validationMessage || fallback;
    missing.set(kind, message);
  }
  return message;
}

/** Copies a native input's validity so the host can report the same errors. */
export function copyValidity(validity: ValidityState): ValidityStateFlags {
  return {
    badInput: validity.badInput,
    customError: validity.customError,
    patternMismatch: validity.patternMismatch,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch,
    tooLong: validity.tooLong,
    tooShort: validity.tooShort,
    typeMismatch: validity.typeMismatch,
    valueMissing: validity.valueMissing,
  };
}
