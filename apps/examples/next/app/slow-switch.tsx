import { NeuSwitch } from '@neumorphism-ui/react';

/**
 * Streams in after the shell, usually after the element definitions have loaded. 1500 ms keeps the
 * stream open until hydration has run, also in dev and Firefox, so client effects mount while the
 * document is still loading (the client-mounted e2e check).
 */
export async function SlowSwitch() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return (
    <NeuSwitch data-testid="late" name="late">
      Streamed switch
    </NeuSwitch>
  );
}
