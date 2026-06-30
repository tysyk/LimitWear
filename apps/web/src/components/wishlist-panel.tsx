'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  closeWishlistItem,
  getWishlist,
  updateWishlistItem,
  WishlistItem,
  WishlistItemStatus,
} from '../lib/wishlist-api';

const FILTERS: Array<{ label: string; value?: WishlistItemStatus }> = [
  { label: 'All' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
];

export function WishlistPanel() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [filter, setFilter] = useState<WishlistItemStatus | undefined>('active');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingDropId, setSavingDropId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getWishlist()
      .then((wishlist) => {
        if (isMounted) setItems(wishlist);
      })
      .catch((caughtError) => {
        if (!isMounted) return;
        setError(
          caughtError instanceof Error ? caughtError.message : 'Could not load wishlist items.',
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!filter) return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  async function handleClose(item: WishlistItem) {
    await saveItem(item.dropId, () => closeWishlistItem(item.dropId), 'Wishlist item closed.');
  }

  async function handleArchive(item: WishlistItem) {
    await saveItem(
      item.dropId,
      () => updateWishlistItem(item.dropId, { status: 'archived' }),
      'Wishlist item archived.',
    );
  }

  async function handleToggleLowStock(item: WishlistItem) {
    await saveItem(
      item.dropId,
      () => updateWishlistItem(item.dropId, { notifyLowStock: !item.notifyLowStock }),
      'Low-stock reminder updated.',
    );
  }

  async function handleToggleSecondChance(item: WishlistItem) {
    await saveItem(
      item.dropId,
      () => updateWishlistItem(item.dropId, { notifySecondChance: !item.notifySecondChance }),
      'Second Chance reminder updated.',
    );
  }

  async function saveItem(
    dropId: string,
    action: () => Promise<WishlistItem>,
    successMessage: string,
  ) {
    setSavingDropId(dropId);
    setError(null);
    setSuccess(null);

    try {
      const updatedItem = await action();
      setItems((currentItems) =>
        currentItems.map((item) => (item.dropId === dropId ? updatedItem : item)),
      );
      setSuccess(successMessage);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Wishlist update failed.');
    } finally {
      setSavingDropId(null);
    }
  }

  return (
    <section className="admin-panel admin-panel--wide">
      <div className="section-heading">
        <p className="eyebrow">Profile</p>
        <h1>Wishlist</h1>
        <p>
          Active, closed and archived interests stay in your profile so LimitWear can power
          reminders and Second Chance access later.
        </p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="notification-toolbar">
        <div className="hero-actions">
          {FILTERS.map((item) => (
            <button
              className={`button ${filter === item.value ? '' : 'button--secondary'}`}
              key={item.label}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <Link className="button button--secondary" href="/#drops">
          Browse drops
        </Link>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <h2>Loading wishlist...</h2>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="notification-list">
          {filteredItems.map((item) => (
            <article className="surface-card" key={item._id ?? item.dropId}>
              <p className="eyebrow">Drop {item.dropId}</p>
              <h2>{formatStatus(item.status)}</h2>
              <p>
                Low-stock reminders: {item.notifyLowStock ? 'on' : 'off'} · Second Chance:{' '}
                {item.notifySecondChance ? 'on' : 'off'}
              </p>
              {item.updatedAt ? (
                <small>Updated {new Date(item.updatedAt).toLocaleString('uk-UA')}</small>
              ) : null}

              <div className="wishlist-actions">
                <button
                  className="button button--secondary"
                  disabled={savingDropId === item.dropId}
                  onClick={() => void handleToggleLowStock(item)}
                  type="button"
                >
                  {item.notifyLowStock ? 'Disable low stock' : 'Enable low stock'}
                </button>
                <button
                  className="button button--secondary"
                  disabled={savingDropId === item.dropId}
                  onClick={() => void handleToggleSecondChance(item)}
                  type="button"
                >
                  {item.notifySecondChance ? 'Disable Second Chance' : 'Enable Second Chance'}
                </button>
                {item.status === 'active' ? (
                  <button
                    className="button button--secondary"
                    disabled={savingDropId === item.dropId}
                    onClick={() => void handleClose(item)}
                    type="button"
                  >
                    Close
                  </button>
                ) : null}
                {item.status !== 'archived' ? (
                  <button
                    className="button button--secondary"
                    disabled={savingDropId === item.dropId}
                    onClick={() => void handleArchive(item)}
                    type="button"
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No wishlist items here yet</h2>
          <p>Add a drop to wishlist from the drop page, then manage reminders here.</p>
        </div>
      )}
    </section>
  );
}

function formatStatus(status: WishlistItemStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
