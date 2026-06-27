import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DropsModule } from '../drops/drops.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    DropsModule,
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [MongooseModule, OrdersService],
})
export class OrdersModule {}
