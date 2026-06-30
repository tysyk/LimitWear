'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AdminDropPayload,
  AdminDropRecord,
  DropStatus,
  ProductType,
  createAdminDrop,
  getAdminDrop,
  getAdminDrops,
  launchAdminDrop,
  transitionAdminDrop,
  updateAdminDrop,
} from '../lib/admin-drops-api';

const PRODUCT_TYPES: ProductType[] = ['tshirt', 'hoodie', 'sweatshirt', 'longsleeve', 'cap'];

const NEXT_STATUSES: Partial<Record<DropStatus, DropStatus[]>> = {
  draft: ['ready_for_launch', 'archived'],
  ready_for_launch: ['active_collecting', 'draft', 'archived'],
  active_collecting: ['guaranteed', 'sold_out', 'failed'],
  guaranteed: ['sold_out', 'successful'],
  sold_out: ['successful'],
  successful: ['in_production'],
  in_production: ['ready_to_ship'],
  ready_to_ship: ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed', 'second_chance_window'],
  second_chance_window: ['forever_closed'],
};

const EMPTY_FORM: AdminDropFormState = {
  designId: '',
  dropNumber: '',
  title: '',
  slug: '',
  productType: 'tshirt',
  price: '0',
  designerRevenuePercent: '10',
  minQuantity: '10',
  maxQuantity: '50',
  sizeOptions: 'S, M, L, XL',
  startsAt: '',
  endsAt: '',
  description: '',
  productColor: '',
  productBase: '',
  material: '',
};

interface AdminDropFormState {
  designId: string;
  dropNumber: string;
  title: string;
  slug: string;
  productType: ProductType;
  price: string;
  designerRevenuePercent: string;
  minQuantity: string;
  maxQuantity: string;
  sizeOptions: string;
  startsAt: string;
  endsAt: string;
  description: string;
  productColor: string;
  productBase: string;
  material: string;
}

export function AdminDropsPanel() {
  const [drops, setDrops] = useState<AdminDropRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedDrop, setSelectedDrop] = useState<AdminDropRecord | null>(null);
  const [form, setForm] = useState<AdminDropFormState>(EMPTY_FORM);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getAdminDrops()
      .then((items) => {
        if (!isMounted) return;
        setDrops(items);
        const first = items[0];
        if (first?._id) {
          setSelectedId(first._id);
          setSelectedDrop(first);
          setForm(toForm(first));
          setMode('edit');
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Could not load drops.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const progress = useMemo(() => getProgress(selectedDrop), [selectedDrop]);
  const nextStatuses = selectedDrop ? NEXT_STATUSES[selectedDrop.status] ?? [] : [];

  async function refreshDrops(nextSelectedId?: string) {
    const items = await getAdminDrops();
    setDrops(items);
    const id = nextSelectedId || selectedId || items[0]?._id || '';
    const selected = id ? items.find((item) => item._id === id) ?? null : null;
    setSelectedId(id);
    setSelectedDrop(selected);
    if (selected) {
      setForm(toForm(selected));
      setMode('edit');
    }
  }

  async function handleSelect(id: string) {
    setSelectedId(id);
    setMode('edit');
    setError(null);
    setSuccess(null);

    const cached = drops.find((item) => item._id === id);
    if (cached) {
      setSelectedDrop(cached);
      setForm(toForm(cached));
    }

    try {
      const fresh = await getAdminDrop(id);
      setSelectedDrop(fresh);
      setForm(toForm(fresh));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not load drop.');
    }
  }

  function handleNew() {
    setMode('create');
    setSelectedId('');
    setSelectedDrop(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = toPayload(form);
      const saved =
        mode === 'edit' && selectedId
          ? await updateAdminDrop(selectedId, payload)
          : await createAdminDrop(payload);
      await refreshDrops(saved._id);
      setSuccess(mode === 'edit' ? 'Drop updated.' : 'Drop draft created.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Drop save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  async function runDropAction(action: () => Promise<AdminDropRecord>, message: string) {
    if (!selectedId) {
      setError('Select a drop first.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await action();
      await refreshDrops(updated._id);
      setSuccess(message);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Drop action failed.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="admin-panel">
        <p className="eyebrow">Admin drops</p>
        <h1>Loading drops...</h1>
      </section>
    );
  }

  return (
    <section className="admin-panel admin-panel--wide">
      <div className="section-heading">
        <p className="eyebrow">Admin drops</p>
        <h1>Drops management</h1>
        <p>
          Create draft drops, edit launch details, track reservation progress and move each drop
          through the approved lifecycle.
        </p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="admin-split">
        <aside className="admin-list">
          <button className={mode === 'create' ? 'is-active' : ''} onClick={handleNew} type="button">
            <strong>+ New drop</strong>
            <span>Create draft</span>
          </button>

          {drops.map((drop) => (
            <button
              className={drop._id === selectedId && mode === 'edit' ? 'is-active' : ''}
              key={drop._id}
              onClick={() => void handleSelect(drop._id ?? '')}
              type="button"
            >
              <strong>{drop.title}</strong>
              <span>
                {drop.dropNumber} · {drop.status}
              </span>
              <small>
                {drop.currentQuantity}/{drop.maxQuantity} reserved
              </small>
            </button>
          ))}
        </aside>

        <div className="production-detail">
          {selectedDrop ? (
            <>
              <div className="delivery-preview">
                <p className="eyebrow">Selected drop</p>
                <h2>{selectedDrop.title}</h2>
                <p>
                  {selectedDrop.dropNumber} · {selectedDrop.productType} · {selectedDrop.status}
                </p>
              </div>

              <div className="drop-info-grid">
                <Info title="Progress" value={`${progress}%`} />
                <Info
                  title="Reservations"
                  value={`${selectedDrop.currentQuantity}/${selectedDrop.maxQuantity}`}
                />
                <Info title="Minimum" value={String(selectedDrop.minQuantity)} />
                <Info title="Price" value={`${selectedDrop.price} ${selectedDrop.currency}`} />
              </div>

              <div className="drop-card__progress" aria-label={`Drop progress ${progress}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="wishlist-actions">
                {selectedDrop.status === 'ready_for_launch' ? (
                  <button
                    className="button button--secondary"
                    disabled={isSaving}
                    onClick={() =>
                      void runDropAction(
                        () => launchAdminDrop(selectedId),
                        'Drop launched and is collecting orders.',
                      )
                    }
                    type="button"
                  >
                    Launch
                  </button>
                ) : null}

                {nextStatuses.map((status) => (
                  <button
                    className="button button--secondary"
                    disabled={isSaving}
                    key={status}
                    onClick={() =>
                      void runDropAction(
                        () => transitionAdminDrop(selectedId, status),
                        `Drop moved to ${status}.`,
                      )
                    }
                    type="button"
                  >
                    Move to {status}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <form className="delivery-form" onSubmit={handleSubmit}>
            <div className="section-heading">
              <p className="eyebrow">{mode === 'edit' ? 'Edit drop' : 'New drop'}</p>
              <h2>{mode === 'edit' ? 'Launch details' : 'Create draft'}</h2>
            </div>

            <div className="form-grid">
              <Field label="Design ID" name="designId" form={form} setForm={setForm} required />
              <Field label="Drop number" name="dropNumber" form={form} setForm={setForm} required />
              <Field label="Title" name="title" form={form} setForm={setForm} required />
              <Field label="Slug" name="slug" form={form} setForm={setForm} required />
            </div>

            <div className="form-grid">
              <label>
                Product type
                <select
                  value={form.productType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      productType: event.target.value as ProductType,
                    }))
                  }
                >
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Price" name="price" type="number" form={form} setForm={setForm} />
              <Field
                label="Designer revenue %"
                name="designerRevenuePercent"
                type="number"
                form={form}
                setForm={setForm}
              />
            </div>

            <div className="form-grid">
              <Field label="Min quantity" name="minQuantity" type="number" form={form} setForm={setForm} />
              <Field label="Max quantity" name="maxQuantity" type="number" form={form} setForm={setForm} />
              <Field label="Sizes" name="sizeOptions" form={form} setForm={setForm} />
            </div>

            <div className="form-grid">
              <Field label="Starts at" name="startsAt" type="datetime-local" form={form} setForm={setForm} />
              <Field label="Ends at" name="endsAt" type="datetime-local" form={form} setForm={setForm} />
            </div>

            <div className="form-grid">
              <Field label="Color" name="productColor" form={form} setForm={setForm} />
              <Field label="Base" name="productBase" form={form} setForm={setForm} />
              <Field label="Material" name="material" form={form} setForm={setForm} />
            </div>

            <label>
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <button className="button" disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save drop' : 'Create draft'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({
  form,
  label,
  name,
  required,
  setForm,
  type = 'text',
}: {
  form: AdminDropFormState;
  label: string;
  name: keyof AdminDropFormState;
  required?: boolean;
  setForm: (updater: (current: AdminDropFormState) => AdminDropFormState) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input
        required={required}
        type={type}
        value={form[name]}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            [name]: event.target.value,
          }))
        }
      />
    </label>
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

function toForm(drop: AdminDropRecord): AdminDropFormState {
  return {
    designId: drop.designId,
    dropNumber: drop.dropNumber,
    title: drop.title,
    slug: drop.slug,
    productType: drop.productType,
    price: String(drop.price),
    designerRevenuePercent: String(drop.designerRevenuePercent),
    minQuantity: String(drop.minQuantity),
    maxQuantity: String(drop.maxQuantity),
    sizeOptions: drop.sizeOptions.join(', '),
    startsAt: toDatetimeLocalValue(drop.startsAt),
    endsAt: toDatetimeLocalValue(drop.endsAt),
    description: drop.description ?? '',
    productColor: drop.productColor ?? '',
    productBase: drop.productBase ?? '',
    material: drop.material ?? '',
  };
}

function toPayload(form: AdminDropFormState): AdminDropPayload {
  return {
    designId: form.designId.trim(),
    dropNumber: form.dropNumber.trim(),
    title: form.title.trim(),
    slug: form.slug.trim(),
    productType: form.productType,
    price: Number(form.price),
    designerRevenuePercent: Number(form.designerRevenuePercent),
    minQuantity: Number(form.minQuantity),
    maxQuantity: Number(form.maxQuantity),
    sizeOptions: form.sizeOptions
      .split(',')
      .map((size) => size.trim())
      .filter(Boolean),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    description: optional(form.description),
    productColor: optional(form.productColor),
    productBase: optional(form.productBase),
    material: optional(form.material),
  };
}

function getProgress(drop: AdminDropRecord | null): number {
  if (!drop || drop.maxQuantity <= 0) return 0;
  return Math.min(Math.round((drop.currentQuantity / drop.maxQuantity) * 100), 100);
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toDatetimeLocalValue(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}
