'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { loginUser, registerUser } from '../lib/auth-api';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = getFormValue(formData, 'email');
    const password = getFormValue(formData, 'password');

    try {
      if (isRegister) {
        await registerUser({
          email,
          password,
          firstName: getOptionalFormValue(formData, 'firstName'),
          lastName: getOptionalFormValue(formData, 'lastName'),
          phone: getOptionalFormValue(formData, 'phone'),
        });
      }

      await loginUser({ email, password });
      router.push('/profile');
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Щось пішло не так');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card__header">
        <p className="eyebrow">{isRegister ? 'Створити акаунт' : 'Повернутись в акаунт'}</p>
        <h1>{isRegister ? 'Реєстрація' : 'Логін'}</h1>
        <p>
          {isRegister
            ? 'Створи профіль LimitWear, щоб потім бронювати дропи й бачити свої замовлення.'
            : 'Увійди, щоб перевірити session cookie і відкрити профіль.'}
        </p>
      </div>

      <label>
        Email
        <input name="email" placeholder="test@example.com" required type="email" />
      </label>

      <label>
        Password
        <input name="password" minLength={8} placeholder="Password1" required type="password" />
      </label>

      {isRegister ? (
        <>
          <label>
            First name
            <input name="firstName" placeholder="Test" />
          </label>
          <label>
            Last name
            <input name="lastName" placeholder="User" />
          </label>
          <label>
            Phone
            <input name="phone" placeholder="+380000000000" />
          </label>
        </>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Працюю...' : isRegister ? 'Зареєструватись' : 'Увійти'}
      </button>

      <p className="auth-switch">
        {isRegister ? 'Вже маєш акаунт?' : 'Ще немає акаунта?'}{' '}
        <Link href={isRegister ? '/login' : '/register'}>
          {isRegister ? 'Увійти' : 'Зареєструватись'}
        </Link>
      </p>
    </form>
  );
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getOptionalFormValue(formData: FormData, key: string): string | undefined {
  const value = getFormValue(formData, key);
  return value.length > 0 ? value : undefined;
}
