import { AnalyticsService } from '../analytics/analytics.service';
import { AdminAnalyticsController } from './admin-analytics.controller';

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let analyticsService: jest.Mocked<Pick<AnalyticsService, 'getAdminAnalytics'>>;

  beforeEach(() => {
    analyticsService = {
      getAdminAnalytics: jest.fn(),
    };
    controller = new AdminAnalyticsController(analyticsService as unknown as AnalyticsService);
  });

  it('delegates platform summary loading to the analytics service', async () => {
    analyticsService.getAdminAnalytics.mockResolvedValue({
      users: { total: 10, designers: 2, active: 9, blocked: 1 },
      drops: { total: 4, active: 1, successful: 2, failed: 1 },
      orders: { total: 8, paid: 6, returned: 1, soldUnits: 12 },
      revenue: { gross: 12000, returns: 1000, net: 11500, currency: 'UAH' },
      secondChance: { soldListings: 1, revenue: 500, soldUnits: 1 },
      payouts: { pendingAmount: 300, paidAmount: 700, readyToPayAmount: 500 },
    });

    await expect(controller.getSummary()).resolves.toEqual({
      users: { total: 10, designers: 2, active: 9, blocked: 1 },
      drops: { total: 4, active: 1, successful: 2, failed: 1 },
      orders: { total: 8, paid: 6, returned: 1, soldUnits: 12 },
      revenue: { gross: 12000, returns: 1000, net: 11500, currency: 'UAH' },
      secondChance: { soldListings: 1, revenue: 500, soldUnits: 1 },
      payouts: { pendingAmount: 300, paidAmount: 700, readyToPayAmount: 500 },
    });
    expect(analyticsService.getAdminAnalytics).toHaveBeenCalledWith();
  });
});
