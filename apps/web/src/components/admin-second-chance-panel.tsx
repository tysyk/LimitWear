'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  cancelSecondChanceListing,
  createSecondChanceListing,
  expireSecondChanceListing,
  getSecondChanceListings,
  makeSecondChancePublic,
  markSecondChanceSold,
  SecondChanceListingRecord,
  setSecondChancePriority,
} from '../lib/second-chance-api';

const DEFAULT_PRIORITY_HOURS = 24;

export function AdminSecondChancePanel() {
  const [listings, setListings] = useState<SecondChanceListingRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [dropId, setDropId] = useState('');
  const [sourceOrderId, setSourceOrderId] = useState('');
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [priorityWindowUntil, setPriorityWindowUntil] = useState('');
  const [publicAvailableAt, setPublicAvailableAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getSecondChanceListings()
      .then((items) => {
        if (!isMounted) return;
        setListings(items);
        setSelectedId(items[0]?._id ?? '');
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Could not load Second Chance listings.',
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

  const selectedListing = useMemo(
    () => listings.find((item) => item._id === selectedId) ?? null,
    [listings, selectedId],
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createSecondChanceListing({
        dropId,
        sourceOrderId: sourceOrderId || undefined,
        size,
        quantity,
        price,
        currency: 'UAH',
      });
      setListings((items) => [created, ...items]);
      setSelectedId(created._id ?? '');
      setSuccess('Second Chance listing created.');
      setSourceOrderId('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not create listing.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetPriority() {
    const until =
      priorityWindowUntil || toDatetimeLocalValue(addHours(new Date(), DEFAULT_PRIORITY_HOURS));
    await updateSelected(
      () => setSecondChancePriority(selectedId, new Date(until).toISOString()),
      'Wishlist priority window enabled.',
    );
  }

  async function handleMakePublic() {
    await updateSelected(
      () =>
        makeSecondChancePublic(
          selectedId,
          publicAvailableAt ? new Date(publicAvailableAt).toISOString() : undefined,
        ),
      'Listing is public.',
    );
  }

  async function updateSelected(action: () => Promise<SecondChanceListingRecord>, message: string) {
    if (!selectedId) {
      setError('Select listing first.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await action();
      setListings((items) => items.map((item) => (item._id === updated._id ? updated : item)));
      setSuccess(message);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Second Chance action failed.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="admin-panel">
        <p className="eyebrow">Admin Second Chance</p>
        <h1>Loading listings...</h1>
      </section>
    );
  }

  return (
    <section className="admin-panel admin-panel--wide">
      <div className="section-heading">
        <p className="eyebrow">Admin Second Chance</p>
        <h1>Second Chance listings</h1>
        <p>
          Create returned/free item listings, give wishlist users priority access, then make items
          public or close the operational loop.
        </p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <form className="delivery-form" onSubmit={handleCreate}>
        <div className="section-heading">
          <p className="eyebrow">Create listing</p>
          <h2>Returned or free unit</h2>
        </div>

        <div className="form-grid">
          <label>
            Drop ID
            <input value={dropId} onChange={(event) => setDropId(event.target.value)} required />
          </label>
          <label>
            Source order ID
            <input
              value={sourceOrderId}
              onChange={(event) => setSourceOrderId(event.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Size
            <input value={size} onChange={(event) => setSize(event.target.value)} required />
          </label>
          <label>
            Quantity
            <input
              min="1"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              required
            />
          </label>
          <label>
            Price
            <input
              min="0"
              type="number"
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
              required
            />
          </label>
        </div>

        <button className="button" disabled={isSaving} type="submit">
          {isSaving ? 'Creating...' : 'Create listing'}
        </button>
      </form>

      {listings.length === 0 ? (
        <div className="empty-state">
          <h2>No Second Chance listings yet</h2>
          <p>Create the first returned/free unit listing when an item is ready to resell.</p>
        </div>
      ) : (
        <div className="admin-split">
          <aside className="admin-list">
            {listings.map((item) => (
              <button
                className={item._id === selectedId ? 'is-active' : ''}
                key={item._id}
                onClick={() => setSelectedId(item._id ?? '')}
                type="button"
              >
                <strong>{item.size}</strong>
                <span>{item.status}</span>
                <small>{formatMoney(item.price, item.currency)}</small>
              </button>
            ))}
          </aside>

          {selectedListing ? (
            <div className="production-detail">
              <div className="delivery-preview">
                <p className="eyebrow">Selected listing</p>
                <h2>{selectedListing.status}</h2>
                <p>
                  Drop {selectedListing.dropId} · {selectedListing.size} · qty{' '}
                  {selectedListing.quantity}
                </p>
              </div>

              <div className="drop-info-grid">
                <Info
                  title="Price"
                  value={formatMoney(selectedListing.price, selectedListing.currency)}
                />
                <Info
                  title="Priority until"
                  value={formatDate(selectedListing.priorityWindowUntil)}
                />
                <Info title="Public from" value={formatDate(selectedListing.publicAvailableAt)} />
                <Info title="Sold at" value={formatDate(selectedListing.soldAt)} />
              </div>

              <div className="surface-card">
                <p className="eyebrow">Priority / public windows</p>
                <div className="form-grid">
                  <label>
                    Priority until
                    <input
                      type="datetime-local"
                      value={priorityWindowUntil}
                      onChange={(event) => setPriorityWindowUntil(event.target.value)}
                    />
                  </label>
                  <label>
                    Public available at
                    <input
                      type="datetime-local"
                      value={publicAvailableAt}
                      onChange={(event) => setPublicAvailableAt(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="wishlist-actions">
                <button
                  className="button button--secondary"
                  disabled={isSaving}
                  onClick={() => void handleSetPriority()}
                  type="button"
                >
                  Set priority
                </button>
                <button
                  className="button button--secondary"
                  disabled={isSaving}
                  onClick={() => void handleMakePublic()}
                  type="button"
                >
                  Make public
                </button>
                <button
                  className="button button--secondary"
                  disabled={isSaving}
                  onClick={() =>
                    void updateSelected(
                      () => markSecondChanceSold(selectedId),
                      'Listing marked sold.',
                    )
                  }
                  type="button"
                >
                  Mark sold
                </button>
                <button
                  className="button button--secondary"
                  disabled={isSaving}
                  onClick={() =>
                    void updateSelected(
                      () => expireSecondChanceListing(selectedId),
                      'Listing expired.',
                    )
                  }
                  type="button"
                >
                  Expire
                </button>
                <button
                  className="button button--secondary"
                  disabled={isSaving}
                  onClick={() =>
                    void updateSelected(
                      () => cancelSecondChanceListing(selectedId),
                      'Listing cancelled.',
                    )
                  }
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
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

function formatMoney(price: number, currency: string): string {
  return `${price} ${currency}`;
}

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleString('uk-UA') : '—';
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toDatetimeLocalValue(date: Date): string {
  return date.toISOString().slice(0, 16);
}
