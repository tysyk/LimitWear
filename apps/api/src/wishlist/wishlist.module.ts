import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { WishlistItem, WishlistItemSchema } from './schemas/wishlist-item.schema';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: WishlistItem.name,
        schema: WishlistItemSchema,
      },
    ]),
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [MongooseModule, WishlistService],
})
export class WishlistModule {}
