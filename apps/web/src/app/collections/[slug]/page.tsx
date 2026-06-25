import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DropCard } from '../../../components/drop-card';
import { getCollection, getCollectionDrops } from '../../../lib/storefront-api';

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const collection = await getCollection(slug);

    return {
      title: collection.title,
      description: collection.description ?? `LimitWear collection ${collection.title}`,
    };
  } catch {
    return {
      title: 'Collection not found',
    };
  }
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getSafeCollection(slug);

  if (!collection) {
    notFound();
  }

  const drops = await getSafeCollectionDrops(slug);

  return (
    <article className="drop-detail">
      <Link className="back-link" href="/#collections">
        ← Back to collections
      </Link>

      <section className="collection-hero">
        <div>
          <p className="eyebrow">{collection.featured ? 'Featured collection' : 'Collection'}</p>
          <h1>{collection.title}</h1>
          <p>{collection.description ?? 'Маркетингова група лімітованих дропів LimitWear.'}</p>
        </div>
        <div className="collection-hero__cover">
          <span>{collection.slug}</span>
        </div>
      </section>

      <section className="storefront-section">
        <div className="section-heading">
          <p className="eyebrow">Collection drops</p>
          <h2>Дропи колекції</h2>
        </div>

        {drops.length > 0 ? (
          <div className="drop-grid">
            {drops.map((drop) => (
              <DropCard key={drop.slug} drop={drop} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>У колекції поки немає public drops</h3>
            <p>Коли admin опублікує дропи цієї колекції, вони підтягнуться сюди з API.</p>
          </div>
        )}
      </section>
    </article>
  );
}

async function getSafeCollection(slug: string) {
  try {
    return await getCollection(slug);
  } catch {
    return null;
  }
}

async function getSafeCollectionDrops(slug: string) {
  try {
    return await getCollectionDrops(slug);
  } catch {
    return [];
  }
}
