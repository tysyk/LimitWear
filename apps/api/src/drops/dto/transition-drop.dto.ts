import { ApiProperty } from '@nestjs/swagger';
import { DropStatus } from '@limitwear/shared';

export class TransitionDropDto {
  @ApiProperty({ enum: DropStatus }) status!: DropStatus;
}
