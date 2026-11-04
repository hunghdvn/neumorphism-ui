import { Suspense } from 'react';
import { ClientMounted } from './client-mounted';
import { DemoForm } from './demo-form';
import { SlowSwitch } from './slow-switch';

/** Rendered per request so the Suspense boundary really streams. */
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main>
      <h1>SSR gate</h1>
      <DemoForm />
      <ClientMounted />
      <Suspense fallback={<p data-testid="fallback">Loading…</p>}>
        <SlowSwitch />
      </Suspense>
    </main>
  );
}
