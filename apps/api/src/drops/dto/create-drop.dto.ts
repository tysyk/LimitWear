import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '../schemas/drop.schema';

export class CreateDropDto {
  @ApiProperty() designId!: string;
  @ApiProperty() dropNumber!: string;
  @ApiProperty() title!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: ProductType }) productType!: ProductType;
  @ApiProperty() price!: number;
  @ApiProperty() designerRevenuePercent!: number;
  @ApiProperty() minQuantity!: number;
  @ApiProperty() maxQuantity!: number;
  @ApiProperty({ type: [String] }) sizeOptions!: string[];
  @ApiProperty() startsAt!: string;
  @ApiProperty() endsAt!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() productColor?: string;
  @ApiPropertyOptional() productBase?: string;
  @ApiPropertyOptional() material?: string;
}
