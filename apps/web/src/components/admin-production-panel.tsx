'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getProductionPackage,
  getProductionPackages,
  ProductionPackageRecord,
  ProductionPackageStatus,
  transitionProductionPackage,
} from '../lib/production-api';

const NEXT_STATUS_OPTIONS: ProductionPackageStatus[] = [
  'sent_to_producer',
  'in_production',
  'completed',
  'ready_to_ship',
  'problem',
  'cancelled',
];

export function AdminProductionPanel() {
  const [packages, setPackages] = useState<ProductionPackageRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<ProductionPackageRecord | null>(null);
  const [nextStatus, setNextStatus] = useState<ProductionPackageStatus>('sent_to_producer');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getProductionPackages()
      .then((items) => {
        if (!isMounted) return;
        setPackages(items);
        const firstId = items[0]?._id ?? '';
        setSelectedId(firstId);
        setSelectedPackage(items[0] ?? null);
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Не вдалося завантажити production packages.',
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

  const sizeRows = useMemo(() => {
    if (!selectedPackage) return [];
    return Object.entries(selectedPackage.sizeBreakdown ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [selectedPackage]);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setError(null);
    setSuccess(null);

    const cached = packages.find((item) => item._id === id);
    if (cached) {
      setSelectedPackage(cached);
    }

    try {
      setSelectedPackage(await getProductionPackage(id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Не вдалося відкрити production package.',
      );
    }
  }

  async function handleTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedId) {
      setError('Оберіть production package.');
      return;
    }

    setIsTransitioning(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await transitionProductionPackage(selectedId, nextStatus, notes);
      setSelectedPackage(updated);
      setPackages((items) => items.map((item) => (item._id === updated._id ? updated : item)));
      setSuccess(`Status updated to ${updated.status}.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Не вдалося оновити production package.',
      );
    } finally {
      setIsTransitioning(false);
    }
  }

  if (isLoading) {
    return (
      <section className="admin-panel">
        <p className="eyebrow">Admin production</p>
        <h1>Завантажую production...</h1>
      </section>
    );
  }

  return (
    <section className="admin-panel admin-panel--wide">
      <div className="section-heading">
        <p className="eyebrow">Admin production</p>
        <h1>Production packages</h1>
        <p>
          Тут admin бачить production package після завершення дропа: size breakdown, order list,
          файли, notes і статус передачі виробнику.
        </p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      {packages.length === 0 ? (
        <div className="empty-state">
          <h2>Поки без production packages</h2>
          <p>Коли дроп перейде у sold_out/successful/completed, backend створить package.</p>
        </div>
      ) : (
        <div className="admin-split">
          <aside className="admin-list">
            {packages.map((item) => (
              <button
                className={item._id === selectedId ? 'is-active' : ''}
                key={item._id}
                onClick={() => void handleSelect(item._id ?? '')}
                type="button"
              >
                <strong>{item.productType}</strong>
                <span>{item.status}</span>
                <small>{item.totalQuantity} pcs</small>
              </button>
            ))}
          </aside>

          {selectedPackage ? (
            <div className="production-detail">
              <div className="delivery-preview">
                <p className="eyebrow">Package</p>
                <h2>{selectedPackage.status}</h2>
                <p>
                  {selectedPackage.productType}
                  {selectedPackage.productColor ? ` · ${selectedPackage.productColor}` : ''}
                  {selectedPackage.material ? ` · ${selectedPackage.material}` : ''}
                </p>
              </div>

              <div className="drop-info-grid">
                <Info title="Total quantity" value={String(selectedPackage.totalQuantity)} />
                <Info
                  title="Production files"
                  value={String(selectedPackage.productionFileIds.length)}
                />
                <Info title="Mockups" value={String(selectedPackage.mockupIds.length)} />
                <Info title="Orders" value={String(selectedPackage.orderIds.length)} />
              </div>

              <div className="surface-card">
                <p className="eyebrow">Size breakdown</p>
                {sizeRows.length > 0 ? (
                  <dl className="profile-list">
                    {sizeRows.map(([size, quantity]) => (
                      <div key={size}>
                        <dt>{size}</dt>
                        <dd>{quantity}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>Size breakdown is empty.</p>
                )}
              </div>

              <div className="surface-card">
                <p className="eyebrow">Order IDs</p>
                <div className="token-list">
                  {selectedPackage.orderIds.map((orderId) => (
                    <span key={orderId}>{orderId}</span>
                  ))}
                </div>
              </div>

              <form className="delivery-form" onSubmit={handleTransition}>
                <div className="form-grid">
                  <label>
                    Next status
                    <select
                      value={nextStatus}
                      onChange={(event) =>
                        setNextStatus(event.target.value as ProductionPackageStatus)
                      }
                    >
                      {NEXT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Notes
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Producer handoff notes"
                    />
                  </label>
                </div>

                <button className="button" disabled={isTransitioning} type="submit">
                  {isTransitioning ? 'Saving...' : 'Update production status'}
                </button>
              </form>
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
