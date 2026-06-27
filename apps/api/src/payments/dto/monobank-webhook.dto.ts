import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonobankWebhookDto {
  @ApiProperty({
    example: '220915A1dc6ZpT4M5Q',
    description: 'Monobank invoice id.',
  })
  invoiceId!: string;

  @ApiPropertyOptional({
    example: 'hold_created',
    description: 'Provider status or internal status mapped from the provider event.',
  })
  status?: string;

  @ApiPropertyOptional({
    example: 'payment-transaction-id',
  })
  paymentInfo?: string;

  @ApiPropertyOptional({
    example: 1719500000,
    description: 'Provider event timestamp if present.',
  })
  modifiedDate?: number;
}
