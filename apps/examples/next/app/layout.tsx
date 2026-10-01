import '@neu-ui/tokens/neu.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'neu-ui SSR gate (Next.js)',
  icons: { icon: 'data:,' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-neu-theme="light">
      <body style={{ margin: 0, padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
