'use client';

import { useState } from 'react';
import { DeliveryCheckoutForm } from './delivery-checkout-form';

interface CheckoutPanelProps {
  dropId?: string;
  sizeOptions: string[];
}

export function CheckoutPanel({ dropId, sizeOptions }: CheckoutPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | undefined>();

  if (!dropId) {
    return (
      <div className="checkout-actions">
        <button className="button" disabled type="button">
          Checkout unavailable
        </button>
        <span>Drop id is missing from the API response.</span>
      </div>
    );
  }

  return (
    <div className="checkout-actions">
      <button className="button" type="button" onClick={() => setIsOpen(true)}>
        Reserve
      </button>
      <span>Open checkout, choose size and Nova Poshta delivery.</span>

      {isOpen ? (
        <div
          aria-labelledby="checkout-title"
          aria-modal="true"
          className="checkout-drawer"
          role="dialog"
        >
          <button
            aria-label="Close checkout"
            className="checkout-drawer__backdrop"
            type="button"
            onClick={() => setIsOpen(false)}
          />
          <aside className="checkout-drawer__panel">
            <div className="checkout-drawer__header">
              <div>
                <p className="eyebrow">Checkout</p>
                <h2 id="checkout-title">Reserve your place</h2>
              </div>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="checkout-explainer">
              <h3>How reservation works</h3>
              <p>
                First we create a pending payment order with your size and delivery details. The
                next payment step reserves funds through Monobank; quantity changes only after
                trusted backend confirmation.
              </p>
            </div>

            {createdOrderId ? (
              <div className="form-success">
                Pending order created: {createdOrderId}. Payment hold step will be connected in the
                next payment flow.
              </div>
            ) : null}

            <DeliveryCheckoutForm
              dropId={dropId}
              sizeOptions={sizeOptions}
              onOrderCreated={setCreatedOrderId}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
