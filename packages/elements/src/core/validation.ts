let checkboxMessage: string | undefined;

/** The browser's own, localised "please check this box" message, borrowed from a native checkbox. */
export function requiredCheckboxMessage(): string {
  if (checkboxMessage === undefined) {
    const probe = document.createElement('input');
    probe.type = 'checkbox';
    probe.required = true;
    checkboxMessage = probe.validationMessage || 'Please check this box if you want to proceed.';
  }
  return checkboxMessage;
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
