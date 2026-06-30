import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { DesignsModule } from '../designs/designs.module';
import { WishlistModule } from '../wishlist/wishlist.module';
import { DropsController } from './drops.controller';
import { DropsService } from './drops.service';
import { Drop, DropSchema } from './schemas/drop.schema';

@Module({
  imports: [
    AuditModule,
    DesignsModule,
    WishlistModule,
    MongooseModule.forFeature([
      {
        name: Drop.name,
        schema: DropSchema,
      },
    ]),
  ],
  controllers: [DropsController],
  providers: [DropsService],
  exports: [MongooseModule, DropsService],
})
export class DropsModule {}
