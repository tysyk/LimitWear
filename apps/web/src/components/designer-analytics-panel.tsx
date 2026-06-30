'use client';

import { useEffect, useState } from 'react';
import { DesignerAnalytics, getDesignerAnalytics } from '../lib/analytics-api';
import { formatMoney } from '../lib/payouts-api';

export function DesignerAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<DesignerAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getDesignerAnalytics()
      .then((summary) => {
        if (isMounted) setAnalytics(summary);
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error ? caughtError.message : 'Could not load analytics.',
          );
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
        <p className="eyebrow">Designer analytics</p>
        <h1>Loading analytics...</h1>
      </section>
    );
  }

  return (
    <section className="designer-dashboard">
      <div className="auth-card__header">
        <p className="eyebrow">Designer analytics</p>
        <h1>Performance</h1>
      </div>
      <p>Track approved work, drops, sold units, revenue, and manual payout status.</p>

      {error ? <p className="form-error">{error}</p> : null}

      {analytics ? (
        <>
          <div className="admin-metric-grid">
            <MetricCard
              label="Designs"
              value={analytics.designs.total}
              note={`${analytics.designs.approved} approved`}
            />
            <MetricCard
              label="Drops"
              value={analytics.drops.total}
              note={`${analytics.drops.successful} successful`}
            />
            <MetricCard label="Sold units" value={analytics.orders.soldUnits} />
            <MetricCard
              label="Gross revenue"
              value={formatMoney(analytics.revenue.gross, analytics.revenue.currency)}
            />
          </div>

          <div className="admin-inbox-grid">
            <PayoutMetric
              label="Ready to pay"
              value={formatMoney(analytics.payouts.readyToPayAmount, analytics.revenue.currency)}
            />
            <PayoutMetric
              label="Pending"
              value={formatMoney(analytics.payouts.pendingAmount, analytics.revenue.currency)}
            />
            <PayoutMetric
              label="Paid"
              value={formatMoney(analytics.payouts.paidAmount, analytics.revenue.currency)}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  note,
  value,
}: {
  label: string;
  note?: string;
  value: number | string;
}) {
  return (
    <div className="admin-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </div>
  );
}

function PayoutMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card">
      <span className="eyebrow">{label}</span>
      <h2>{value}</h2>
    </div>
  );
}
