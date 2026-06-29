import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { NovaPoshtaService } from './nova-poshta.service';
import { Delivery, DeliverySchema } from './schemas/delivery.schema';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      {
        name: Delivery.name,
        schema: DeliverySchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, NovaPoshtaService],
  exports: [DeliveryService, MongooseModule, NovaPoshtaService],
})
export class DeliveryModule {}
