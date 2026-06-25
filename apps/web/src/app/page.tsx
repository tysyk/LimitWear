import Link from 'next/link';
import { DropCard } from '../components/drop-card';
import { getStorefrontData } from '../lib/storefront-api';

export default async function Home() {
  const storefront = await getSafeStorefrontData();
  const featuredDrop = storefront.data?.drops[0];
  const drops = storefront.data?.drops.slice(0, 8) ?? [];
  const collections = storefront.data?.collections.slice(0, 4) ?? [];
  const designers = storefront.data?.designers.slice(0, 4) ?? [];

  return (
    <div className="storefront">
      <section className="hero hero--storefront">
        <p className="eyebrow">Limited edition streetwear platform</p>
        <h1>Речі, які не стають масовими.</h1>
        <p className="hero-copy">
          LimitWear збирає незалежних дизайнерів і людей, які хочуть носити дропи з обмеженим
          тиражем. Кожен реліз має мінімум, максимум і чесний прогрес збору.
        </p>
        <div className="hero-actions">
          <Link className="button" href="#drops">
            Дивитись дропи
          </Link>
          <Link className="button button--secondary" href="/register">
            Створити акаунт
          </Link>
        </div>
      </section>

      {storefront.error ? (
        <section className="surface-card" role="status">
          <p className="eyebrow">API status</p>
          <h2>Storefront API тимчасово недоступний</h2>
          <p>{storefront.error}</p>
        </section>
      ) : null}

      {featuredDrop ? (
        <section className="featured-drop">
          <div>
            <p className="eyebrow">Featured drop</p>
            <h2>{featuredDrop.title}</h2>
            <p>{featuredDrop.description ?? 'Лімітований реліз від LimitWear.'}</p>
            <Link className="button" href={`/drops/${featuredDrop.slug}`}>
              Відкрити дроп
            </Link>
          </div>
          <DropCard drop={featuredDrop} />
        </section>
      ) : null}

      <section id="drops" className="storefront-section">
        <div className="section-heading">
          <p className="eyebrow">Active drops</p>
          <h2>Актуальні релізи</h2>
        </div>

        {drops.length > 0 ? (
          <div className="drop-grid">
            {drops.map((drop) => (
              <DropCard key={drop.slug} drop={drop} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Дропів ще немає"
            copy="Коли admin запустить public drops, вони зʼявляться тут автоматично."
          />
        )}
      </section>

      <section id="collections" className="storefront-section">
        <div className="section-heading">
          <p className="eyebrow">Collections</p>
          <h2>Колекції</h2>
        </div>

        {collections.length > 0 ? (
          <div className="teaser-grid">
            {collections.map((collection) => (
              <article className="surface-card" key={collection.slug}>
                <p className="eyebrow">{collection.featured ? 'Featured' : 'Collection'}</p>
                <h3>
                  <Link href={`/collections/${collection.slug}`}>{collection.title}</Link>
                </h3>
                <p>{collection.description ?? 'Маркетингова група дропів LimitWear.'}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Колекції готуються"
            copy="Published collections підтягнуться з API після наповнення бази."
          />
        )}
      </section>

      <section id="designers" className="storefront-section">
        <div className="section-heading">
          <p className="eyebrow">Designers</p>
          <h2>Дизайнери</h2>
        </div>

        {designers.length > 0 ? (
          <div className="teaser-grid">
            {designers.map((designer) => (
              <article className="surface-card" key={designer.slug}>
                <p className="eyebrow">Designer</p>
                <h3>
                  <Link href={`/designers/${designer.slug}`}>{designer.displayName}</Link>
                </h3>
                <p>{designer.bio ?? 'Публічний профіль дизайнера LimitWear.'}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Дизайнери ще не опубліковані"
            copy="Active designer profiles зʼявляться тут після review flow."
          />
        )}
      </section>
    </div>
  );
}

function EmptyState({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

async function getSafeStorefrontData() {
  try {
    return {
      data: await getStorefrontData(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown storefront error',
    };
  }
}
