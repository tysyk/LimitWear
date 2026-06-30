import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import {
  DesignerProfile,
  DesignerProfileSchema,
} from '../designer-profiles/schemas/designer-profile.schema';
import { Drop, DropSchema } from '../drops/schemas/drop.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { PayoutsService } from './payouts.service';
import { Payout, PayoutSchema } from './schemas/payout.schema';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      {
        name: Payout.name,
        schema: PayoutSchema,
      },
      {
        name: Drop.name,
        schema: DropSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: DesignerProfile.name,
        schema: DesignerProfileSchema,
      },
    ]),
  ],
  providers: [PayoutsService],
  exports: [MongooseModule, PayoutsService],
})
export class PayoutsModule {}
