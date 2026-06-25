import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestsService } from './requests.service';
import { Request, RequestSchema } from './schemas/request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Request.name,
        schema: RequestSchema,
      },
    ]),
  ],
  providers: [RequestsService],
  exports: [MongooseModule, RequestsService],
})
export class RequestsModule {}
