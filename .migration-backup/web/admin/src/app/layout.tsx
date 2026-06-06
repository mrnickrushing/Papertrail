import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FileTrail Admin',
  description: 'FileTrail developer dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
