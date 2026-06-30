'use client';

import { useEffect, useState } from 'react';
import { AdminAnalytics, getAdminAnalytics } from '../lib/analytics-api';
import { formatMoney } from '../lib/payouts-api';

export function AdminAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getAdminAnalytics()
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
      <section className="admin-panel admin-panel--wide">
        <p className="eyebrow">Admin analytics</p>
        <h1>Loading analytics...</h1>
      </section>
    );
  }

  return (
    <section className="admin-panel admin-panel--wide">
      <div className="auth-card__header">
        <p className="eyebrow">Admin analytics</p>
        <h1>Platform summary</h1>
      </div>
      <p className="admin-muted">
        Monitor users, drops, orders, revenue, Second Chance sales, and payout exposure.
      </p>

      {error ? <p className="form-error">{error}</p> : null}

      {analytics ? (
        <>
          <div className="admin-metric-grid">
            <MetricCard
              label="Users"
              value={analytics.users.total}
              note={`${analytics.users.designers} designers`}
            />
            <MetricCard
              label="Active users"
              value={analytics.users.active}
              note={`${analytics.users.blocked} blocked`}
            />
            <MetricCard
              label="Drops"
              value={analytics.drops.total}
              note={`${analytics.drops.active} active`}
            />
            <MetricCard
              label="Drop outcome"
              value={`${analytics.drops.successful}/${analytics.drops.failed}`}
              note="successful / failed"
            />
            <MetricCard
              label="Orders"
              value={analytics.orders.total}
              note={`${analytics.orders.paid} paid, ${analytics.orders.returned} returned`}
            />
            <MetricCard label="Sold units" value={analytics.orders.soldUnits} />
          </div>

          <div className="admin-inbox-grid">
            <MoneyCard
              label="Net revenue"
              value={formatMoney(analytics.revenue.net, analytics.revenue.currency)}
              note={`Gross ${formatMoney(analytics.revenue.gross, analytics.revenue.currency)}`}
            />
            <MoneyCard
              label="Returns"
              value={formatMoney(analytics.revenue.returns, analytics.revenue.currency)}
              note="Refunded and returned order value"
            />
            <MoneyCard
              label="Second Chance"
              value={formatMoney(analytics.secondChance.revenue, analytics.revenue.currency)}
              note={`${analytics.secondChance.soldListings} listings, ${analytics.secondChance.soldUnits} units`}
            />
            <MoneyCard
              label="Payouts ready"
              value={formatMoney(analytics.payouts.readyToPayAmount, analytics.revenue.currency)}
              note={`Pending ${formatMoney(
                analytics.payouts.pendingAmount,
                analytics.revenue.currency,
              )}`}
            />
            <MoneyCard
              label="Payouts paid"
              value={formatMoney(analytics.payouts.paidAmount, analytics.revenue.currency)}
              note="Manual transfers marked paid"
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

function MoneyCard({ label, note, value }: { label: string; note: string; value: string }) {
  return (
    <div className="surface-card">
      <span className="eyebrow">{label}</span>
      <h2>{value}</h2>
      <p>{note}</p>
    </div>
  );
}
