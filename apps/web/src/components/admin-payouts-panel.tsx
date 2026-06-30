'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ensurePayoutForDrop,
  formatMoney,
  getAdminPayouts,
  markPayoutPaid,
  PayoutRecord,
} from '../lib/payouts-api';

export function AdminPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [dropId, setDropId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getAdminPayouts()
      .then((items) => {
        if (!isMounted) return;
        setPayouts(items);
        setSelectedId(items[0]?._id ?? '');
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

  const selectedPayout = useMemo(
    () => payouts.find((item) => item._id === selectedId) ?? payouts[0] ?? null,
    [payouts, selectedId],
  );

  async function handleEnsure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const payout = await ensurePayoutForDrop(dropId);
      upsertPayout(payout);
      setSelectedId(payout._id ?? '');
      setSuccess(`Payout ${payout.status} calculated for drop.`);
      setDropId('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not calculate payout.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPayout?._id) {
      setError('Choose payout first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const payout = await markPayoutPaid(selectedPayout._id, {
        amount: paidAmount ? Number(paidAmount) : undefined,
        notes,
      });
      upsertPayout(payout);
      setSuccess(`Payout marked ${payout.status}.`);
      setPaidAmount('');
      setNotes('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not mark payout paid.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function upsertPayout(payout: PayoutRecord) {
    setPayouts((items) => {
      const exists = items.some((item) => item._id === payout._id);
      return exists
        ? items.map((item) => (item._id === payout._id ? payout : item))
        : [payout, ...items];
    });
  }

  if (isLoading) {
    return (
      <section className="admin-panel">
        <p className="eyebrow">Admin payouts</p>
        <h1>Loading payouts...</h1>
      </section>
    );
  }

  return (
    <section className="admin-panel admin-panel--wide">
      <div className="section-heading">
        <p className="eyebrow">Admin payouts</p>
        <h1>Designer payouts</h1>
        <p>
          Calculate manual designer payouts after a completed drop and mark transfers as paid after
          the real bank transfer is done.
        </p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <form className="delivery-form" onSubmit={handleEnsure}>
        <div className="form-grid">
          <label>
            Completed drop id
            <input
              value={dropId}
              onChange={(event) => setDropId(event.target.value)}
              placeholder="Mongo ObjectId"
              required
            />
          </label>
        </div>
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Calculating...' : 'Calculate payout'}
        </button>
      </form>

      {payouts.length === 0 ? (
        <div className="empty-state">
          <h2>No payouts yet</h2>
          <p>Calculate a payout from a completed drop to start the manual payout flow.</p>
        </div>
      ) : (
        <div className="admin-split">
          <aside className="admin-list">
            {payouts.map((payout) => (
              <button
                className={payout._id === selectedPayout?._id ? 'is-active' : ''}
                key={payout._id}
                onClick={() => setSelectedId(payout._id ?? '')}
                type="button"
              >
                <strong>{formatMoney(payout.amount, payout.currency)}</strong>
                <span>{payout.status}</span>
                <small>{payout.designerRevenuePercent}% designer share</small>
              </button>
            ))}
          </aside>

          {selectedPayout ? (
            <div className="production-detail">
              <PayoutSummary payout={selectedPayout} />

              <form className="delivery-form" onSubmit={handleMarkPaid}>
                <div className="form-grid">
                  <label>
                    Paid amount
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={paidAmount}
                      onChange={(event) => setPaidAmount(event.target.value)}
                      placeholder="Leave empty to pay remaining"
                    />
                  </label>
                  <label>
                    Notes / transfer reference
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Bank transfer reference"
                    />
                  </label>
                </div>
                <button className="button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Saving...' : 'Mark paid'}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function PayoutSummary({ payout }: { payout: PayoutRecord }) {
  return (
    <div className="production-detail">
      <div className="delivery-preview">
        <p className="eyebrow">Payout</p>
        <h2>{formatMoney(payout.amount, payout.currency)}</h2>
        <p>
          Paid: {formatMoney(payout.paidAmount, payout.currency)} · status: {payout.status}
        </p>
      </div>

      <div className="drop-info-grid">
        <Info title="Sold units" value={String(payout.calculationBase.soldUnits)} />
        <Info title="Returns" value={String(payout.calculationBase.returnedUnits)} />
        <Info
          title="Net revenue"
          value={formatMoney(payout.calculationBase.netRevenue, payout.currency)}
        />
        <Info title="Designer share" value={`${payout.designerRevenuePercent}%`} />
      </div>

      <div className="surface-card">
        <p className="eyebrow">Calculation base</p>
        <dl className="profile-list">
          <div>
            <dt>Gross revenue</dt>
            <dd>{formatMoney(payout.calculationBase.grossRevenue, payout.currency)}</dd>
          </div>
          <div>
            <dt>Returned revenue</dt>
            <dd>{formatMoney(payout.calculationBase.returnedRevenue, payout.currency)}</dd>
          </div>
          <div>
            <dt>Second Chance revenue</dt>
            <dd>{formatMoney(payout.calculationBase.secondChanceRevenue, payout.currency)}</dd>
          </div>
          <div>
            <dt>Return window ends</dt>
            <dd>
              {payout.calculationBase.returnWindowEndsAt
                ? new Date(payout.calculationBase.returnWindowEndsAt).toLocaleDateString('uk-UA')
                : 'Not set'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface-card">
      <p className="eyebrow">{title}</p>
      <h3>{value}</h3>
    </div>
  );
}
