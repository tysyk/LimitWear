import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DropCard,
  formatCurrency,
  formatStatus,
  getDropProgress,
} from '../../../components/drop-card';
import { CheckoutPanel } from '../../../components/checkout-panel';
import { WishlistButton } from '../../../components/wishlist-button';
import { getDrop, getRelatedDrops } from '../../../lib/storefront-api';

interface DropDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: DropDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const drop = await getDrop(slug);

    return {
      title: drop.title,
      description: drop.description ?? `LimitWear drop ${drop.dropNumber}`,
    };
  } catch {
    return {
      title: 'Drop not found',
    };
  }
}

export default async function DropDetailPage({ params }: DropDetailPageProps) {
  const { slug } = await params;
  const drop = await getSafeDrop(slug);

  if (!drop) {
    notFound();
  }

  const relatedDrops = await getSafeRelatedDrops(slug);
  const progress = getDropProgress(drop);

  return (
    <article className="drop-detail">
      <Link className="back-link" href="/#drops">
        ← Back to drops
      </Link>

      <section className="drop-detail__hero">
        <div className="drop-detail__media">
          <span>{drop.productType}</span>
        </div>

        <div className="drop-detail__summary">
          <p className="eyebrow">
            {drop.dropNumber} · {formatStatus(drop.status)}
          </p>
          <h1>{drop.title}</h1>
          <p>{drop.description ?? 'Лімітований дроп LimitWear.'}</p>

          <div className="drop-detail__price">
            {formatCurrency(drop.price, drop.currency)}
            <span>
              {drop.currentQuantity}/{drop.maxQuantity} reserved
            </span>
          </div>

          <div className="drop-card__progress" aria-label={`Progress ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="drop-detail__actions">
            <CheckoutPanel dropId={drop._id} sizeOptions={drop.sizeOptions} />
            {drop._id ? <WishlistButton dropId={drop._id} /> : null}
          </div>
        </div>
      </section>

      <section className="drop-info-grid">
        <InfoBlock
          title="Product"
          value={[drop.productType, drop.productColor, drop.material].filter(Boolean).join(' · ')}
        />
        <InfoBlock
          title="Sizes"
          value={
            drop.sizeOptions.length > 0 ? drop.sizeOptions.join(', ') : 'Sizes will be announced'
          }
        />
        <InfoBlock title="Drop window" value={formatDropWindow(drop.startsAt, drop.endsAt)} />
        <InfoBlock
          title="How it works"
          value="Дроп збирає резерви до максимуму. Quantity росте тільки після trusted backend payment confirmation."
        />
      </section>

      <section className="storefront-section">
        <div className="section-heading">
          <p className="eyebrow">Related drops</p>
          <h2>Схожі релізи</h2>
        </div>

        {relatedDrops.length > 0 ? (
          <div className="drop-grid">
            {relatedDrops.map((relatedDrop) => (
              <DropCard key={relatedDrop.slug} drop={relatedDrop} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Поки без related drops</h3>
            <p>Коли зʼявляться дропи з тієї ж колекції або дизайнера, вони будуть тут.</p>
          </div>
        )}
      </section>
    </article>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface-card">
      <p className="eyebrow">{title}</p>
      <p>{value || '—'}</p>
    </div>
  );
}

async function getSafeDrop(slug: string) {
  try {
    return await getDrop(slug);
  } catch {
    return null;
  }
}

async function getSafeRelatedDrops(slug: string) {
  try {
    return await getRelatedDrops(slug);
  } catch {
    return [];
  }
}

function formatDropWindow(startsAt?: string, endsAt?: string): string {
  const start = startsAt ? new Date(startsAt).toLocaleDateString('uk-UA') : null;
  const end = endsAt ? new Date(endsAt).toLocaleDateString('uk-UA') : null;

  if (start && end) {
    return `${start} — ${end}`;
  }

  return start ?? end ?? 'Dates will be announced';
}
