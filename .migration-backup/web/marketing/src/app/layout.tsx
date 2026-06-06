import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FileTrail — Your documents, your device.',
  description: 'Scan, organise, and search all your documents — locally, privately, and offline.',
  openGraph: {
    title: 'FileTrail',
    description: 'Scan, organise, and search all your documents — locally, privately, and offline.',
    images: ['/icon.png'],
  },
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
