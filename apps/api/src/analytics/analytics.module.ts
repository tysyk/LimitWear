import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DesignerProfile,
  DesignerProfileSchema,
} from '../designer-profiles/schemas/designer-profile.schema';
import { Design, DesignSchema } from '../designs/schemas/design.schema';
import { Drop, DropSchema } from '../drops/schemas/drop.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Payout, PayoutSchema } from '../payouts/schemas/payout.schema';
import {
  SecondChanceListing,
  SecondChanceListingSchema,
} from '../second-chance/schemas/second-chance-listing.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DesignerProfile.name, schema: DesignerProfileSchema },
      { name: Design.name, schema: DesignSchema },
      { name: Drop.name, schema: DropSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payout.name, schema: PayoutSchema },
      { name: SecondChanceListing.name, schema: SecondChanceListingSchema },
    ]),
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
