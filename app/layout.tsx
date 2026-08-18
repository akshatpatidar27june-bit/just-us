import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Just Us', description: 'Our little corner of the internet.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}