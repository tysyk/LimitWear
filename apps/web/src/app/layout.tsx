import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LimitWear',
    template: '%s | LimitWear',
  },
  description: 'Платформа лімітованого одягу та незалежних дизайнерів.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="LimitWear — головна">
            LIMITWEAR
          </Link>
          <nav className="site-nav" aria-label="Основна навігація">
            <Link href="/#drops">Drops</Link>
            <Link href="/#collections">Collections</Link>
            <Link href="/#designers">Designers</Link>
            <Link href="/register">Register</Link>
            <Link href="/login">Login</Link>
            <Link href="/profile">Profile</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <span>© {new Date().getFullYear()} LimitWear</span>
          <span>Limited by design.</span>
        </footer>
      </body>
    </html>
  );
}
