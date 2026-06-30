'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { getCurrentUser, PublicUser } from '../lib/auth-api';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Action Center' },
  { href: '/admin/drops', label: 'Drops' },
  { href: '/admin/delivery', label: 'Delivery' },
  { href: '/admin/production', label: 'Production' },
  { href: '/admin/second-chance', label: 'Second Chance' },
  { href: '/admin/payouts', label: 'Payouts' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((response) => {
        if (!isMounted) return;

        if (response.user.role !== 'admin') {
          router.replace('/profile');
          return;
        }

        setUser(response.user);
      })
      .catch((caughtError) => {
        if (!isMounted) return;
        setError(
          caughtError instanceof Error ? caughtError.message : 'Admin session was not found.',
        );
        router.replace('/login');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <section className="admin-panel">
        <p className="eyebrow">Admin</p>
        <h1>Checking access...</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="admin-panel">
        <p className="eyebrow">Admin</p>
        <h1>Admin access required</h1>
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>LimitWear CRM</h2>
          <p>{user.email}</p>
        </div>

        <nav aria-label="Admin navigation">
          {ADMIN_LINKS.map((link) => (
            <Link
              className={pathname === link.href ? 'is-active' : ''}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-content">{children}</div>
    </div>
  );
}
