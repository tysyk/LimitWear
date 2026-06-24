'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, logoutUser, PublicUser } from '../lib/auth-api';

export function ProfilePanel() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((response) => {
        if (isMounted) {
          setUser(response.user);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error ? caughtError.message : 'Не вдалось відкрити профіль',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    setError(null);

    try {
      await logoutUser();
      router.push('/login');
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не вдалось вийти');
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return (
      <section className="auth-card">
        <p className="eyebrow">Профіль</p>
        <h1>Завантажую...</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="auth-card">
        <p className="eyebrow">Профіль</p>
        <h1>Потрібен логін</h1>
        <p>{error ?? 'Сесія не знайдена або вже завершилась.'}</p>
        <Link className="button" href="/login">
          Увійти
        </Link>
      </section>
    );
  }

  return (
    <section className="auth-card profile-card">
      <div className="auth-card__header">
        <p className="eyebrow">Профіль</p>
        <h1>{getDisplayName(user)}</h1>
        <p>Це дані з GET /auth/me. Sensitive fields, включно з passwordHash, сюди не приходять.</p>
      </div>

      <dl className="profile-list">
        <div>
          <dt>ID</dt>
          <dd>{user.id}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{user.role}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{user.status}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{getDisplayName(user)}</dd>
        </div>
        <div>
          <dt>Last login</dt>
          <dd>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('uk-UA') : '—'}</dd>
        </div>
      </dl>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="button button--secondary" disabled={isLoggingOut} onClick={handleLogout}>
        {isLoggingOut ? 'Виходжу...' : 'Вийти'}
      </button>
    </section>
  );
}

function getDisplayName(user: PublicUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}
