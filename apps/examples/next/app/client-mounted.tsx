'use client';
import { NeuTextField } from '@neu-ui/react';
import { useEffect, useState } from 'react';

/** Created by script after hydration, which can happen while the Suspense stream is still open. */
export function ClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Fixed height so mounting the field moves nothing (the CLS check in the SSR gate).
  return (
    <div style={{ height: 80, maxWidth: 360 }}>
      {mounted ? <NeuTextField data-testid="client-mounted" label="Client" /> : null}
    </div>
  );
}
