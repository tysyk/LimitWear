import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDesignDto {
  @ApiProperty({
    example: 'Oversized Panther Hoodie',
  })
  title!: string;

  @ApiPropertyOptional({
    example: 'oversized-panther-hoodie',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'Heavy cotton hoodie with embroidered panther artwork.',
  })
  description?: string;

  @ApiPropertyOptional({
    example: 'hoodies',
  })
  category?: string;

  @ApiPropertyOptional({
    example: ['hoodie', 'embroidery', 'black'],
    type: [String],
  })
  tags?: string[];

  @ApiPropertyOptional({
    example: '6674b275c08ff9a9c9a4b001',
  })
  mainFileId?: string;

  @ApiPropertyOptional({
    example: ['6674b275c08ff9a9c9a4b002'],
    type: [String],
  })
  previewImageIds?: string[];

  @ApiPropertyOptional({
    example: ['6674b275c08ff9a9c9a4b003'],
    type: [String],
  })
  mockupImageIds?: string[];

  @ApiPropertyOptional({
    example: ['6674b275c08ff9a9c9a4b004'],
    type: [String],
  })
  productionFileIds?: string[];
}
