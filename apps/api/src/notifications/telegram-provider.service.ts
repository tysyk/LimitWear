import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendTelegramMessageInput {
  telegramId: string;
  text: string;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
}

export interface TelegramDeliveryResult {
  status: 'sent' | 'skipped' | 'failed';
  providerMessageId?: string;
  error?: string;
}

interface TelegramApiResponse {
  ok?: unknown;
  result?: {
    message_id?: unknown;
  };
  description?: unknown;
}

@Injectable()
export class TelegramProviderService {
  private readonly logger = new Logger(TelegramProviderService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMessage(input: SendTelegramMessageInput): Promise<TelegramDeliveryResult> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim();

    if (!token) {
      this.logger.warn('Telegram message skipped because bot token is not configured.');
      return { status: 'skipped', error: 'telegram_bot_not_configured' };
    }

    const apiBaseUrl =
      this.configService.get<string>('TELEGRAM_BOT_API_BASE_URL')?.trim() ??
      'https://api.telegram.org';

    try {
      const response = await fetch(`${apiBaseUrl}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: input.telegramId,
          text: input.text,
          parse_mode: input.parseMode,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as TelegramApiResponse;

      if (!response.ok || data.ok === false) {
        const description =
          typeof data.description === 'string' ? data.description : `status ${response.status}`;
        this.logger.error(`Telegram message failed: ${description}`);

        return {
          status: 'failed',
          error: 'telegram_provider_failed',
        };
      }

      return {
        status: 'sent',
        providerMessageId: this.getProviderMessageId(data),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown telegram provider failure';
      this.logger.error(`Telegram provider threw: ${message}`);

      return {
        status: 'failed',
        error: 'telegram_provider_exception',
      };
    }
  }

  private getProviderMessageId(data: TelegramApiResponse): string | undefined {
    const messageId = data.result?.message_id;

    if (typeof messageId === 'number' || typeof messageId === 'string') {
      return String(messageId);
    }

    return undefined;
  }
}
