import { NeuSwitch } from '@neu-ui/react';

/** Streams in after the shell, usually after the element definitions have loaded. */
export async function SlowSwitch() {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return (
    <NeuSwitch data-testid="late" name="late">
      Streamed switch
    </NeuSwitch>
  );
}
