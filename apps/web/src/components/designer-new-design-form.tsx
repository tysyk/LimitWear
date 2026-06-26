'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { getCurrentUser, PublicUser } from '../lib/auth-api';
import {
  createDesignerDesign,
  getEntityId,
  submitDesignerDesign,
  uploadDesignerDesignFile,
} from '../lib/designer-api';

export function DesignerNewDesignForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const design = await createDesignerDesign({
        title: getFormValue(formData, 'title'),
        slug: getOptionalFormValue(formData, 'slug'),
        description: getOptionalFormValue(formData, 'description'),
        category: getOptionalFormValue(formData, 'category'),
        tags: getOptionalListValue(formData, 'tags'),
      });
      const designId = getEntityId(design);

      await uploadOptionalFile(formData, 'originalFile', (file) =>
        uploadDesignerDesignFile(designId, 'design_original', file),
      );
      await uploadFiles(formData, 'previewFiles', (file) =>
        uploadDesignerDesignFile(designId, 'design_preview', file),
      );
      await uploadFiles(formData, 'mockupFiles', (file) =>
        uploadDesignerDesignFile(designId, 'mockup', file),
      );

      if (formData.get('submitNow') === 'on') {
        await submitDesignerDesign(designId);
      }

      router.push('/designer/designs');
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not create design');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <DesignerFormShell title="Loading new design..." />;
  }

  if (!user) {
    return (
      <DesignerFormShell title="Login required">
        <p>Sign in as a designer to submit work.</p>
        <Link className="button" href="/login">
          Login
        </Link>
      </DesignerFormShell>
    );
  }

  if (user.role !== 'designer') {
    return (
      <DesignerFormShell title="Designer access required">
        <p>Your account is not approved as a designer yet.</p>
        <Link className="button" href="/designer">
          Apply as designer
        </Link>
      </DesignerFormShell>
    );
  }

  return (
    <DesignerFormShell title="New design">
      <form className="designer-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input name="title" placeholder="Oversized Panther Hoodie" required />
        </label>
        <label>
          Slug
          <input name="slug" placeholder="oversized-panther-hoodie" />
        </label>
        <label>
          Description
          <textarea
            name="description"
            placeholder="Describe the idea, artwork, and product fit."
            rows={5}
          />
        </label>
        <label>
          Category
          <input name="category" placeholder="hoodies" />
        </label>
        <label>
          Tags
          <textarea name="tags" placeholder="hoodie, embroidery, black" rows={3} />
        </label>
        <label>
          Original design file
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            name="originalFile"
            type="file"
          />
        </label>
        <label>
          Preview images
          <input
            accept="image/jpeg,image/png,image/webp"
            multiple
            name="previewFiles"
            type="file"
          />
        </label>
        <label>
          Mockup images
          <input accept="image/jpeg,image/png,image/webp" multiple name="mockupFiles" type="file" />
        </label>
        <label className="checkbox-label">
          <input name="submitNow" type="checkbox" />
          Submit for admin review immediately
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : 'Create design'}
        </button>
      </form>
    </DesignerFormShell>
  );
}

interface DesignerFormShellProps {
  children?: React.ReactNode;
  title: string;
}

function DesignerFormShell({ children, title }: DesignerFormShellProps) {
  return (
    <section className="designer-dashboard">
      <Link className="back-link" href="/designer/designs">
        Back to designs
      </Link>
      <div className="auth-card__header">
        <p className="eyebrow">Designer designs</p>
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

async function uploadOptionalFile(
  formData: FormData,
  key: string,
  upload: (file: File) => Promise<unknown>,
) {
  const file = formData.get(key);

  if (file instanceof File && file.size > 0) {
    await upload(file);
  }
}

async function uploadFiles(
  formData: FormData,
  key: string,
  upload: (file: File) => Promise<unknown>,
) {
  const files = formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);

  await Promise.all(files.map(upload));
}
