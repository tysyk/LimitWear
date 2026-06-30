import { OrderStatus } from '@limitwear/shared';
import { calculatePayout } from './payout-calculation';
import { PayoutStatus } from './schemas/payout.schema';

describe('calculatePayout', () => {
  it('calculates designer revenue from eligible paid orders', () => {
    const result = calculatePayout({
      currency: 'UAH',
      designerRevenuePercent: 25,
      orders: [
        { status: OrderStatus.Paid, quantity: 2, priceAtPurchase: 1200 },
        { status: OrderStatus.Delivered, quantity: 1, priceAtPurchase: 1000 },
        { status: OrderStatus.PendingPayment, quantity: 5, priceAtPurchase: 999 },
      ],
      now: new Date('2026-06-30T00:00:00.000Z'),
    });

    expect(result.amount).toBe(850);
    expect(result.status).toBe(PayoutStatus.ReadyToPay);
    expect(result.calculationBase).toMatchObject({
      soldUnits: 3,
      grossRevenue: 3400,
      netRevenue: 3400,
      eligibleOrderCount: 2,
    });
  });

  it('keeps payout pending while the return window is open', () => {
    const result = calculatePayout({
      currency: 'UAH',
      designerRevenuePercent: 10,
      orders: [{ status: OrderStatus.Paid, quantity: 1, priceAtPurchase: 2000 }],
      returnWindowEndsAt: new Date('2026-07-01T00:00:00.000Z'),
      now: new Date('2026-06-30T00:00:00.000Z'),
    });

    expect(result.amount).toBe(200);
    expect(result.status).toBe(PayoutStatus.Pending);
  });

  it('subtracts returns and adds second chance revenue to the calculation base', () => {
    const result = calculatePayout({
      currency: 'UAH',
      designerRevenuePercent: 20,
      secondChanceRevenue: 500,
      secondChanceSoldUnits: 1,
      orders: [
        { status: OrderStatus.Paid, quantity: 3, priceAtPurchase: 1000 },
        { status: OrderStatus.Returned, quantity: 1, priceAtPurchase: 1000 },
      ],
    });

    expect(result.amount).toBe(500);
    expect(result.calculationBase).toMatchObject({
      soldUnits: 3,
      returnedUnits: 1,
      secondChanceSoldUnits: 1,
      grossRevenue: 3000,
      returnedRevenue: 1000,
      secondChanceRevenue: 500,
      netRevenue: 2500,
    });
  });
});
