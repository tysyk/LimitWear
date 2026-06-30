'use client';

import { useEffect, useState } from 'react';
import { PayoutSummary } from './admin-payouts-panel';
import { getDesignerPayouts, PayoutRecord } from '../lib/payouts-api';

export function DesignerPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getDesignerPayouts()
      .then((items) => {
        if (isMounted) setPayouts(items);
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Could not load payouts.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="designer-dashboard">
        <p className="eyebrow">Designer payouts</p>
        <h1>Loading payouts...</h1>
      </section>
    );
  }

  return (
    <section className="designer-dashboard">
      <div className="auth-card__header">
        <p className="eyebrow">Designer payouts</p>
        <h1>Payout history</h1>
      </div>
      <p>
        These records show manual payouts calculated by LimitWear after completed drops and return
        windows.
      </p>

      {error ? <p className="form-error">{error}</p> : null}

      {payouts.length === 0 ? (
        <div className="empty-state">
          <h2>No payouts yet</h2>
          <p>Payouts will appear here after your drops complete and the admin calculates them.</p>
        </div>
      ) : (
        <div className="admin-inbox-grid">
          {payouts.map((payout) => (
            <PayoutSummary key={payout._id} payout={payout} />
          ))}
        </div>
      )}
    </section>
  );
}
