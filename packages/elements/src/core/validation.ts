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
