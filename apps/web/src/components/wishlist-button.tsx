'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { addWishlistItem, closeWishlistItem, getWishlist, WishlistItem } from '../lib/wishlist-api';

interface WishlistButtonProps {
  dropId: string;
}

export function WishlistButton({ dropId }: WishlistButtonProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getWishlist()
      .then((wishlist) => {
        if (isMounted) setItems(wishlist);
      })
      .catch((caughtError) => {
        if (!isMounted) return;
        setError(
          caughtError instanceof Error ? caughtError.message : 'Login is required for wishlist.',
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeItem = useMemo(
    () => items.find((item) => item.dropId === dropId && item.status === 'active'),
    [dropId, items],
  );

  async function handleToggle() {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updatedItem = activeItem
        ? await closeWishlistItem(dropId)
        : await addWishlistItem(dropId);
      setItems((currentItems) => {
        const existingIndex = currentItems.findIndex((item) => item.dropId === dropId);

        if (existingIndex === -1) {
          return [updatedItem, ...currentItems];
        }

        return currentItems.map((item, index) => (index === existingIndex ? updatedItem : item));
      });
      setSuccess(activeItem ? 'Removed from active wishlist.' : 'Added to wishlist.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Wishlist action failed. Please retry.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <span className="field-hint">Checking wishlist...</span>;
  }

  if (error && items.length === 0) {
    return (
      <div className="wishlist-widget">
        <Link className="button button--secondary" href="/login">
          Login to wishlist
        </Link>
        <small>{error}</small>
      </div>
    );
  }

  return (
    <div className="wishlist-widget">
      <button className="button button--secondary" disabled={isSaving} onClick={handleToggle}>
        {isSaving ? 'Saving...' : activeItem ? 'Remove from wishlist' : 'Add to wishlist'}
      </button>
      {success ? <small className="form-success">{success}</small> : null}
      {error ? <small className="form-error">{error}</small> : null}
    </div>
  );
}
