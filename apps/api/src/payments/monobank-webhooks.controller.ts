import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonobankWebhookDto } from './dto/monobank-webhook.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class MonobankWebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Handle Monobank payment webhook events' })
  @Post('monobank')
  handleMonobankWebhook(
    @Body() dto: MonobankWebhookDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.paymentsService.handleMonobankWebhook(dto, headers);
  }
}
