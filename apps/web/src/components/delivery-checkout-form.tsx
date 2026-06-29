'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DeliveryCity,
  DeliveryWarehouse,
  getDeliveryWarehouses,
  searchDeliveryCities,
} from '../lib/delivery-api';
import { createOrder } from '../lib/orders-api';

interface DeliveryCheckoutFormProps {
  dropId: string;
  sizeOptions: string[];
}

export function DeliveryCheckoutForm({ dropId, sizeOptions }: DeliveryCheckoutFormProps) {
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<DeliveryCity[]>([]);
  const [city, setCity] = useState<DeliveryCity | null>(null);
  const [warehouses, setWarehouses] = useState<DeliveryWarehouse[]>([]);
  const [warehouse, setWarehouse] = useState<DeliveryWarehouse | null>(null);
  const [size, setSize] = useState(sizeOptions[0] ?? '');
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cityQuery.trim().length < 2 || city?.name === cityQuery.trim()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSearchingCities(true);
      searchDeliveryCities(cityQuery)
        .then(setCities)
        .catch((caughtError) => {
          setError(caughtError instanceof Error ? caughtError.message : 'Не вдалося знайти міста.');
        })
        .finally(() => setIsSearchingCities(false));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [city, cityQuery]);

  const preview = useMemo(() => {
    if (!city || !warehouse) {
      return 'Оберіть місто і відділення, щоб побачити превʼю доставки.';
    }

    return `${recipientName || 'Отримувач'} · ${recipientPhone || 'телефон'} · ${city.name}, ${warehouse.name}`;
  }, [city, recipientName, recipientPhone, warehouse]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!city || !warehouse) {
      setError('Оберіть місто та відділення Нової Пошти.');
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await createOrder({
        dropId,
        size,
        quantity,
        recipientName,
        recipientPhone,
        cityRef: city.ref,
        cityName: city.name,
        warehouseRef: warehouse.ref,
        warehouseName: warehouse.name,
        deliveryType: 'warehouse',
      });

      setSuccess(`Замовлення створено. ID: ${order._id ?? 'pending'}. Наступний крок — оплата.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Не вдалося створити замовлення.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCitySelect(selectedCity: DeliveryCity) {
    setCity(selectedCity);
    setCityQuery(selectedCity.name);
    setCities([]);
    setWarehouses([]);
    setWarehouse(null);
    setIsLoadingWarehouses(true);
    setError(null);

    try {
      const items = await getDeliveryWarehouses(selectedCity.ref);
      setWarehouses(items);
      setWarehouse(items[0] ?? null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Не вдалося завантажити відділення.',
      );
    } finally {
      setIsLoadingWarehouses(false);
    }
  }

  return (
    <form className="delivery-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <p className="eyebrow">Checkout delivery</p>
        <h2>Забронювати дроп</h2>
        <p>
          Оберіть розмір, контакти і відділення Нової Пошти. Backend все одно перевіряє drop,
          quantity і delivery data.
        </p>
      </div>

      <div className="form-grid">
        <label>
          Розмір
          <select value={size} onChange={(event) => setSize(event.target.value)} required>
            {sizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          Кількість
          <input
            min="1"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            required
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Отримувач
          <input
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            placeholder="Олег Тисик"
            required
          />
        </label>

        <label>
          Телефон
          <input
            value={recipientPhone}
            onChange={(event) => setRecipientPhone(event.target.value)}
            placeholder="+380991234567"
            required
          />
        </label>
      </div>

      <label className="autocomplete-field">
        Місто Нової Пошти
        <input
          value={cityQuery}
          onChange={(event) => {
            setCity(null);
            setCities([]);
            setWarehouse(null);
            setWarehouses([]);
            setCityQuery(event.target.value);
          }}
          placeholder="Почніть вводити місто"
          required
        />
        {isSearchingCities ? <span className="field-hint">Шукаю міста...</span> : null}
        {cities.length > 0 ? (
          <div className="autocomplete-list">
            {cities.map((item) => (
              <button key={item.ref} type="button" onClick={() => void handleCitySelect(item)}>
                <span>{item.name}</span>
                {item.area ? <small>{item.area}</small> : null}
              </button>
            ))}
          </div>
        ) : null}
      </label>

      <label>
        Відділення / поштомат
        <select
          disabled={!city || isLoadingWarehouses}
          value={warehouse?.ref ?? ''}
          onChange={(event) => {
            setWarehouse(warehouses.find((item) => item.ref === event.target.value) ?? null);
          }}
          required
        >
          <option value="">
            {isLoadingWarehouses ? 'Завантажую відділення...' : 'Оберіть відділення'}
          </option>
          {warehouses.map((item) => (
            <option key={item.ref} value={item.ref}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="delivery-preview">
        <p className="eyebrow">Preview</p>
        <p>{preview}</p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <button className="button" disabled={isSubmitting || sizeOptions.length === 0} type="submit">
        {isSubmitting ? 'Створюю...' : 'Створити order'}
      </button>
    </form>
  );
}
