'use client';

import { FormEvent, useState } from 'react';
import { createTtnForOrder, DeliveryRecord } from '../lib/delivery-api';

export function AdminTtnForm() {
  const [orderId, setOrderId] = useState('');
  const [weight, setWeight] = useState(1);
  const [seatsAmount, setSeatsAmount] = useState(1);
  const [description, setDescription] = useState('LimitWear order');
  const [cost, setCost] = useState(1000);
  const [delivery, setDelivery] = useState<DeliveryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDelivery(null);
    setIsSubmitting(true);

    try {
      const result = await createTtnForOrder(orderId, {
        weight,
        seatsAmount,
        description,
        cost,
      });
      setDelivery(result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не вдалося створити ТТН.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="section-heading">
        <p className="eyebrow">Admin delivery</p>
        <h1>Створення ТТН</h1>
        <p>
          Для MVP менеджер вставляє ready_to_ship order ID, перевіряє параметри посилки і створює
          ТТН Нової Пошти.
        </p>
      </div>

      <form className="delivery-form" onSubmit={handleSubmit}>
        <label>
          Order ID
          <input
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="Mongo order id"
            required
          />
        </label>

        <div className="form-grid">
          <label>
            Вага, кг
            <input
              min="0.1"
              step="0.1"
              type="number"
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
              required
            />
          </label>

          <label>
            Місць
            <input
              min="1"
              type="number"
              value={seatsAmount}
              onChange={(event) => setSeatsAmount(Number(event.target.value))}
              required
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            Опис
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>

          <label>
            Оголошена вартість
            <input
              min="1"
              type="number"
              value={cost}
              onChange={(event) => setCost(Number(event.target.value))}
              required
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Створюю...' : 'Створити ТТН'}
        </button>
      </form>

      {delivery ? (
        <div className="delivery-preview">
          <p className="eyebrow">Tracking</p>
          <h2>{delivery.trackingNumber ?? 'ТТН створена'}</h2>
          <dl className="profile-list">
            <div>
              <dt>Status</dt>
              <dd>{delivery.status}</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>
                {delivery.recipientName}, {delivery.recipientPhone}
              </dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                {delivery.cityName}, {delivery.warehouseName}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
