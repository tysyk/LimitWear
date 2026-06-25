import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyDesignerDto {
  @ApiProperty({
    example: 'LimitWear Studio',
  })
  displayName!: string;

  @ApiProperty({
    example: 'limitwear-studio',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'Streetwear designer focused on limited capsule drops.',
  })
  bio?: string;

  @ApiPropertyOptional({
    example: ['https://instagram.com/limitwear', 'https://behance.net/limitwear'],
    type: [String],
  })
  portfolioLinks?: string[];

  @ApiPropertyOptional({
    example: 'I want to launch limited drops on LimitWear.',
  })
  message?: string;
}
