import Link from 'next/link';
import type { StorefrontDrop } from '../lib/storefront-api';

interface DropCardProps {
  drop: StorefrontDrop;
}

export function DropCard({ drop }: DropCardProps) {
  const progress = getDropProgress(drop);
  const leftPlaces = Math.max(drop.maxQuantity - drop.currentQuantity, 0);

  return (
    <article className="drop-card">
      <Link className="drop-card__media" href={`/drops/${drop.slug}`} aria-label={drop.title}>
        <span>{drop.productType}</span>
      </Link>

      <div className="drop-card__body">
        <div className="drop-card__meta">
          <span>{formatStatus(drop.status)}</span>
          <span>{formatCurrency(drop.price, drop.currency)}</span>
        </div>

        <h3>
          <Link href={`/drops/${drop.slug}`}>{drop.title}</Link>
        </h3>

        {drop.description ? <p>{drop.description}</p> : null}

        <div className="drop-card__progress" aria-label={`Progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="drop-card__stats">
          <span>
            {drop.currentQuantity}/{drop.maxQuantity} reserved
          </span>
          <span>{leftPlaces} left</span>
        </div>

        <div className="drop-card__footer">
          <span>{getDropTimerLabel(drop)}</span>
          <Link href={`/drops/${drop.slug}`}>View drop</Link>
        </div>
      </div>
    </article>
  );
}

export function getDropProgress(drop: StorefrontDrop): number {
  if (drop.maxQuantity <= 0) {
    return 0;
  }

  return Math.min(Math.round((drop.currentQuantity / drop.maxQuantity) * 100), 100);
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('uk-UA', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    active_collecting: 'Collecting',
    archived: 'Archived',
    cancelled: 'Cancelled',
    completed: 'Completed',
    delivered: 'Delivered',
    draft: 'Draft',
    failed: 'Failed',
    forever_closed: 'Closed',
    guaranteed: 'Guaranteed',
    in_production: 'In production',
    ready_for_launch: 'Ready',
    ready_to_ship: 'Ready to ship',
    scheduled: 'Scheduled',
    second_chance_window: 'Second chance',
    shipped: 'Shipped',
    sold_out: 'Sold out',
    successful: 'Successful',
  };

  return labels[status] ?? status;
}

function getDropTimerLabel(drop: StorefrontDrop): string {
  if (drop.endsAt) {
    const endsAt = new Date(drop.endsAt);
    const diffMs = endsAt.getTime() - Date.now();

    if (Number.isFinite(diffMs) && diffMs > 0) {
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return `${days} day${days === 1 ? '' : 's'} left`;
    }
  }

  if (drop.startsAt) {
    return `Started ${new Date(drop.startsAt).toLocaleDateString('uk-UA')}`;
  }

  return 'Limited release';
}
