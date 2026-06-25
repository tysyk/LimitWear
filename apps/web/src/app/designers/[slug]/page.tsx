import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DropCard } from '../../../components/drop-card';
import { getDesigner, getDesignerDrops } from '../../../lib/storefront-api';

interface DesignerPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: DesignerPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const designer = await getDesigner(slug);

    return {
      title: designer.displayName,
      description: designer.bio ?? `LimitWear designer ${designer.displayName}`,
    };
  } catch {
    return {
      title: 'Designer not found',
    };
  }
}

export default async function DesignerPage({ params }: DesignerPageProps) {
  const { slug } = await params;
  const designer = await getSafeDesigner(slug);

  if (!designer) {
    notFound();
  }

  const drops = await getSafeDesignerDrops(slug);

  return (
    <article className="drop-detail">
      <Link className="back-link" href="/#designers">
        ← Back to designers
      </Link>

      <section className="designer-hero">
        <div className="designer-avatar" aria-hidden="true">
          {getInitials(designer.displayName)}
        </div>
        <div>
          <p className="eyebrow">Designer</p>
          <h1>{designer.displayName}</h1>
          <p>{designer.bio ?? 'Публічний профіль дизайнера LimitWear.'}</p>

          <DesignerLinks links={designer.socialLinks} portfolioLinks={designer.portfolioLinks} />
        </div>
      </section>

      <section className="storefront-section">
        <div className="section-heading">
          <p className="eyebrow">Designer drops</p>
          <h2>Релізи дизайнера</h2>
        </div>

        {drops.length > 0 ? (
          <div className="drop-grid">
            {drops.map((drop) => (
              <DropCard key={drop.slug} drop={drop} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>У дизайнера поки немає public drops</h3>
            <p>Коли зʼявляться активні релізи, вони будуть показані тут.</p>
          </div>
        )}
      </section>
    </article>
  );
}

function DesignerLinks({
  links,
  portfolioLinks,
}: {
  links?: Record<string, string>;
  portfolioLinks?: string[];
}) {
  const socialEntries = Object.entries(links ?? {});
  const portfolioEntries = portfolioLinks ?? [];

  if (socialEntries.length === 0 && portfolioEntries.length === 0) {
    return null;
  }

  return (
    <div className="designer-links">
      {socialEntries.map(([label, href]) => (
        <a href={href} key={label} rel="noreferrer" target="_blank">
          {label}
        </a>
      ))}
      {portfolioEntries.map((href) => (
        <a href={href} key={href} rel="noreferrer" target="_blank">
          Portfolio
        </a>
      ))}
    </div>
  );
}

async function getSafeDesigner(slug: string) {
  try {
    return await getDesigner(slug);
  } catch {
    return null;
  }
}

async function getSafeDesignerDrops(slug: string) {
  try {
    return await getDesignerDrops(slug);
  } catch {
    return [];
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
