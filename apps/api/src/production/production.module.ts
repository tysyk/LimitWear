import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Drop, DropSchema } from '../drops/schemas/drop.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { ProductionService } from './production.service';
import { ProductionPackage, ProductionPackageSchema } from './schemas/production-package.schema';

@Module({
  imports: [
    AuditModule,
    NotificationsModule,
    MongooseModule.forFeature([
      {
        name: ProductionPackage.name,
        schema: ProductionPackageSchema,
      },
      {
        name: Drop.name,
        schema: DropSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
  ],
  providers: [ProductionService],
  exports: [MongooseModule, ProductionService],
})
export class ProductionModule {}
