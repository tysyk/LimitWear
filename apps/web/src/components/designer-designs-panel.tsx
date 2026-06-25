'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, PublicUser } from '../lib/auth-api';
import {
  DesignerDesign,
  getDesignerDesigns,
  getEntityId,
  submitDesignerDesign,
} from '../lib/designer-api';

export function DesignerDesignsPanel() {
  const [designs, setDesigns] = useState<DesignerDesign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const currentUser = (await getCurrentUser()).user;

        if (!isMounted) {
          return;
        }

        setUser(currentUser);

        if (currentUser.role === 'designer') {
          setDesigns(await getDesignerDesigns());
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Could not load designs');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmitDesign(design: DesignerDesign) {
    const designId = getEntityId(design);

    if (!designId) {
      return;
    }

    setSubmittingId(designId);
    setError(null);

    try {
      const submittedDesign = await submitDesignerDesign(designId);
      setDesigns((currentDesigns) =>
        currentDesigns.map((currentDesign) =>
          getEntityId(currentDesign) === designId ? submittedDesign : currentDesign,
        ),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not submit design');
    } finally {
      setSubmittingId(null);
    }
  }

  if (isLoading) {
    return <DesignerPageShell title="Loading designs..." />;
  }

  if (!user) {
    return (
      <DesignerPageShell title="Login required">
        <p>Sign in as a designer to manage submitted work.</p>
        <Link className="button" href="/login">
          Login
        </Link>
      </DesignerPageShell>
    );
  }

  if (user.role !== 'designer') {
    return (
      <DesignerPageShell title="Designer access required">
        <p>Your account is not approved as a designer yet.</p>
        <Link className="button" href="/designer">
          Apply as designer
        </Link>
      </DesignerPageShell>
    );
  }

  return (
    <DesignerPageShell
      action={
        <Link className="button" href="/designer/designs/new">
          New design
        </Link>
      }
      title="Your designs"
    >
      {error ? <p className="form-error">{error}</p> : null}

      {designs.length === 0 ? (
        <div className="empty-state">
          <h3>No designs yet</h3>
          <p>Create your first draft and submit it for admin review.</p>
        </div>
      ) : (
        <div className="designer-design-list">
          {designs.map((design) => {
            const designId = getEntityId(design);
            const canSubmit = design.status === 'draft' || design.status === 'needs_changes';

            return (
              <article className="surface-card" key={designId || design.title}>
                <div className="designer-design-list__header">
                  <div>
                    <p className="eyebrow">{design.status}</p>
                    <h2>{design.title}</h2>
                  </div>
                  {canSubmit ? (
                    <button
                      className="button button--secondary"
                      disabled={submittingId === designId}
                      onClick={() => void handleSubmitDesign(design)}
                      type="button"
                    >
                      {submittingId === designId ? 'Submitting...' : 'Submit'}
                    </button>
                  ) : null}
                </div>
                {design.description ? <p>{design.description}</p> : null}
                {design.adminComment ? <p>Admin comment: {design.adminComment}</p> : null}
                {design.rejectionReason ? <p>Rejected: {design.rejectionReason}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </DesignerPageShell>
  );
}

interface DesignerPageShellProps {
  action?: React.ReactNode;
  children?: React.ReactNode;
  title: string;
}

function DesignerPageShell({ action, children, title }: DesignerPageShellProps) {
  return (
    <section className="designer-dashboard">
      <Link className="back-link" href="/designer">
        Back to cabinet
      </Link>
      <div className="designer-page-heading">
        <div>
          <p className="eyebrow">Designer designs</p>
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
