import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryController } from './delivery.controller';
import { NovaPoshtaService } from './nova-poshta.service';
import { Delivery, DeliverySchema } from './schemas/delivery.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Delivery.name,
        schema: DeliverySchema,
      },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [NovaPoshtaService],
  exports: [MongooseModule, NovaPoshtaService],
})
export class DeliveryModule {}
