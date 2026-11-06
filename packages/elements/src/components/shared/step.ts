/** A step a native input would accept; anything at or below zero means the default of 1. */
export const stepUnit = (step: number): number => (step > 0 ? step : 1);
