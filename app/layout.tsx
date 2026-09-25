import type { Metadata } from 'next';
import Link from 'next/link';
import { Bricolage_Grotesque, Atkinson_Hyperlegible, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/**
 * Atkinson Hyperlegible is the body face on purpose (spec 9): it was designed
 * for low-vision readers, and this is an app people read with one hand on a
 * breadboard.
 */
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['600', '800'],
});

const atkinson = Atkinson_Hyperlegible({
  variable: '--font-atkinson',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Jumper: your first Arduino projects',
  description:
    'A setup guide and beginner Arduino builds. Every step shows exactly which hole to use, explains why, and helps you find the problem when something does not work.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${atkinson.variable} ${jetbrains.variable}`}>
      <body className="min-h-full">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-5">
          <header className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-2.5 font-head text-2xl font-extrabold text-ink" aria-label="Jumper home">
              <svg viewBox="0 0 34 22" className="h-[22px] w-[34px]" aria-hidden="true">
                <path d="M4 18 C4 2, 30 2, 30 18" fill="none" stroke="#F2B53A" strokeWidth="4" strokeLinecap="round" />
                <rect x="1.5" y="16" width="5" height="5" rx="1" fill="currentColor" />
                <rect x="27.5" y="16" width="5" height="5" rx="1" fill="currentColor" />
              </svg>
              Jumper
            </Link>
            <nav className="flex gap-1.5" aria-label="Main">
              <Link href="/" className="rounded-lg px-3 py-2 text-[15px] font-bold text-ink hover:bg-panel">
                Projects
              </Link>
              <Link href="/parts" className="rounded-lg px-3 py-2 text-[15px] font-bold text-ink hover:bg-panel">
                Parts
              </Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
