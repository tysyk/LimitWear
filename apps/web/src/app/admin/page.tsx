import type { Metadata } from 'next';

const QUEUE_SUMMARY = [
  {
    label: 'Designer applications',
    value: '0',
    description: 'New requests waiting for admin review.',
  },
  {
    label: 'Design reviews',
    value: '0',
    description: 'Submitted designs that need approve / changes / reject.',
  },
  {
    label: 'Delivery issues',
    value: '0',
    description: 'Orders with failed TTN creation or tracking problems.',
  },
  {
    label: 'Production tasks',
    value: '0',
    description: 'Drops that need package updates or status changes.',
  },
  {
    label: 'Payouts',
    value: '0',
    description: 'Designer payouts waiting for manual confirmation.',
  },
  {
    label: 'Second Chance',
    value: '0',
    description: 'Returned or free units waiting for resale decisions.',
  },
];

const INBOX_SECTIONS = [
  {
    title: 'Requests',
    items: ['Designer applications', 'Profile / account support', 'Manual order questions'],
  },
  {
    title: 'Catalog',
    items: ['Design moderation', 'Drop launch readiness', 'Collection publishing'],
  },
  {
    title: 'Operations',
    items: ['Payment exceptions', 'Delivery problems', 'Production delays', 'Second Chance'],
  },
  {
    title: 'Finance',
    items: ['Payout calculation review', 'Mark payout as paid', 'Refund / return follow-up'],
  },
];

export const metadata: Metadata = {
  title: 'Admin action center',
};

export default function AdminPage() {
  return (
    <section className="admin-panel admin-panel--wide">
      <div>
        <p className="eyebrow">Admin Inbox</p>
        <h1>Action Center</h1>
        <p className="admin-muted">
          Main internal CRM screen for everything that needs a LimitWear team decision. Real
          counters will be connected to admin endpoints as each module lands.
        </p>
      </div>

      <div className="admin-metric-grid" aria-label="Admin queue summary">
        {QUEUE_SUMMARY.map((item) => (
          <article className="admin-metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="admin-inbox-grid">
        {INBOX_SECTIONS.map((section) => (
          <article className="surface-card" key={section.title}>
            <h2>{section.title}</h2>
            <ul className="admin-check-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="empty-state">
        <h3>No live inbox data yet</h3>
        <p>
          This placeholder locks the admin page structure now. Next backend tasks will replace the
          mock counters with requests, designs, orders, production packages, payouts and alerts.
        </p>
      </div>
    </section>
  );
}
