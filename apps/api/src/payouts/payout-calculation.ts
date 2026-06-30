import { OrderStatus } from '@limitwear/shared';
import { PayoutCalculationBase, PayoutStatus } from './schemas/payout.schema';

export interface PayoutOrderInput {
  status: OrderStatus;
  quantity: number;
  priceAtPurchase: number;
}

export interface CalculatePayoutInput {
  orders: PayoutOrderInput[];
  currency: string;
  designerRevenuePercent: number;
  secondChanceRevenue?: number;
  secondChanceSoldUnits?: number;
  returnWindowEndsAt?: Date;
  now?: Date;
}

export interface CalculatedPayout {
  amount: number;
  currency: string;
  calculationBase: PayoutCalculationBase;
  status: PayoutStatus.Pending | PayoutStatus.ReadyToPay;
}

const PAYOUT_REVENUE_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.Paid,
  OrderStatus.InProduction,
  OrderStatus.ReadyToShip,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
]);

const RETURNED_ORDER_STATUSES = new Set<OrderStatus>([OrderStatus.Returned, OrderStatus.Refunded]);

export function calculatePayout(input: CalculatePayoutInput): CalculatedPayout {
  const now = input.now ?? new Date();
  const secondChanceRevenue = input.secondChanceRevenue ?? 0;
  const secondChanceSoldUnits = input.secondChanceSoldUnits ?? 0;

  const revenueOrders = input.orders.filter((order) =>
    PAYOUT_REVENUE_ORDER_STATUSES.has(order.status),
  );
  const returnedOrders = input.orders.filter((order) => RETURNED_ORDER_STATUSES.has(order.status));

  const soldUnits = sumUnits(revenueOrders);
  const returnedUnits = sumUnits(returnedOrders);
  const grossRevenue = sumRevenue(revenueOrders);
  const returnedRevenue = sumRevenue(returnedOrders);
  const netRevenue = Math.max(0, grossRevenue - returnedRevenue + secondChanceRevenue);
  const amount = roundMoney((netRevenue * input.designerRevenuePercent) / 100);
  const status =
    input.returnWindowEndsAt && input.returnWindowEndsAt > now
      ? PayoutStatus.Pending
      : PayoutStatus.ReadyToPay;

  return {
    amount,
    currency: input.currency,
    status,
    calculationBase: {
      soldUnits,
      returnedUnits,
      secondChanceSoldUnits,
      grossRevenue,
      returnedRevenue,
      secondChanceRevenue,
      netRevenue,
      eligibleOrderCount: revenueOrders.length,
      returnWindowEndsAt: input.returnWindowEndsAt,
    },
  };
}

function sumUnits(orders: PayoutOrderInput[]): number {
  return orders.reduce((total, order) => total + order.quantity, 0);
}

function sumRevenue(orders: PayoutOrderInput[]): number {
  return orders.reduce((total, order) => total + order.quantity * order.priceAtPurchase, 0);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
