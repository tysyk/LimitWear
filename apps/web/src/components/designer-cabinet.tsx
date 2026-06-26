'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getCurrentUser, PublicUser } from '../lib/auth-api';
import { applyDesigner, getEntityId, uploadDesignerApplicationFile } from '../lib/designer-api';

export function DesignerCabinet() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
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
          setError(caughtError instanceof Error ? caughtError.message : 'Login is required');
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

  async function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const attachmentFiles = getFiles(formData, 'attachments');
      const uploadedFiles = await Promise.all(
        attachmentFiles.map((file) => uploadDesignerApplicationFile(file)),
      );
      const request = await applyDesigner({
        displayName: getFormValue(formData, 'displayName'),
        slug: getFormValue(formData, 'slug'),
        bio: getOptionalFormValue(formData, 'bio'),
        portfolioLinks: getOptionalListValue(formData, 'portfolioLinks'),
        message: getOptionalFormValue(formData, 'message'),
        fileIds: uploadedFiles.map(getEntityId),
      });

      setSuccess(`Application submitted. Status: ${request.status}`);
      event.currentTarget.reset();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Application failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <DesignerShell title="Loading designer cabinet..." eyebrow="Designer cabinet" />;
  }

  if (!user) {
    return (
      <DesignerShell title="Login required" eyebrow="Designer cabinet">
        <p>Sign in to apply as a designer or manage your submitted designs.</p>
        <Link className="button" href="/login">
          Login
        </Link>
      </DesignerShell>
    );
  }

  if (user.role !== 'designer') {
    return (
      <DesignerShell title="Apply to become a designer" eyebrow="Designer application">
        <p>
          Every account starts as a user. Submit an application and the team will review it before
          designer tools are unlocked.
        </p>

        <form className="designer-form" onSubmit={handleApply}>
          <label>
            Display name
            <input name="displayName" placeholder="LimitWear Studio" required />
          </label>
          <label>
            Slug
            <input name="slug" placeholder="limitwear-studio" required />
          </label>
          <label>
            Bio
            <textarea name="bio" placeholder="Tell us about your work." rows={4} />
          </label>
          <label>
            Portfolio links
            <textarea name="portfolioLinks" placeholder="https://instagram.com/..." rows={3} />
          </label>
          <label>
            Message
            <textarea name="message" placeholder="Why do you want to join LimitWear?" rows={3} />
          </label>
          <label>
            Portfolio files
            <input
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              name="attachments"
              type="file"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="form-success">{success}</p> : null}

          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      </DesignerShell>
    );
  }

  return (
    <DesignerShell title="Designer cabinet" eyebrow="Designer tools">
      <p>
        Create designs, submit them for admin review, and track the next operational blocks as they
        come online.
      </p>

      <div className="designer-action-grid">
        <Link className="surface-card" href="/designer/designs">
          <span className="eyebrow">Designs</span>
          <h2>Manage designs</h2>
          <p>Create drafts, submit work for review, and see moderation comments.</p>
        </Link>
        <div className="surface-card">
          <span className="eyebrow">Payouts</span>
          <h2>Coming soon</h2>
          <p>Payout balance and payment history will appear after payout backend is ready.</p>
        </div>
        <div className="surface-card">
          <span className="eyebrow">Analytics</span>
          <h2>Coming soon</h2>
          <p>Designer stats will connect after drops, orders, and analytics services are ready.</p>
        </div>
      </div>
    </DesignerShell>
  );
}

interface DesignerShellProps {
  children?: React.ReactNode;
  eyebrow: string;
  title: string;
}

function DesignerShell({ children, eyebrow, title }: DesignerShellProps) {
  return (
    <section className="designer-dashboard">
      <div className="auth-card__header">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </section>
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

function getOptionalListValue(formData: FormData, key: string): string[] | undefined {
  const value = getFormValue(formData, key);

  if (!value) {
    return undefined;
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFiles(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}
