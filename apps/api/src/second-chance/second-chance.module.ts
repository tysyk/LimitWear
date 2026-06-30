import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SecondChanceListing,
  SecondChanceListingSchema,
} from './schemas/second-chance-listing.schema';
import { SecondChanceService } from './second-chance.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SecondChanceListing.name,
        schema: SecondChanceListingSchema,
      },
    ]),
  ],
  providers: [SecondChanceService],
  exports: [MongooseModule, SecondChanceService],
})
export class SecondChanceModule {}
