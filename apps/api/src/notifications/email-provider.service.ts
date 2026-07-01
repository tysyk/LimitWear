import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendTransactionalEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailDeliveryResult {
  status: 'sent' | 'skipped' | 'failed';
  providerMessageId?: string;
  error?: string;
}

interface EmailProviderResponse {
  id?: unknown;
  messageId?: unknown;
}

@Injectable()
export class EmailProviderService {
  private readonly logger = new Logger(EmailProviderService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendTransactional(input: SendTransactionalEmailInput): Promise<EmailDeliveryResult> {
    const apiUrl = this.configService.get<string>('EMAIL_PROVIDER_API_URL')?.trim();
    const apiKey = this.configService.get<string>('EMAIL_PROVIDER_API_KEY')?.trim();
    const from = this.configService.get<string>('EMAIL_FROM')?.trim();

    if (!apiUrl || !apiKey || !from) {
      this.logger.warn('Transactional email skipped because provider is not configured.');
      return { status: 'skipped', error: 'email_provider_not_configured' };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
          metadata: input.metadata,
        }),
      });

      if (!response.ok) {
        const errorBody = await this.readErrorBody(response);
        this.logger.error(
          `Transactional email failed with provider status ${response.status}: ${errorBody}`,
        );

        return {
          status: 'failed',
          error: `provider_status_${response.status}`,
        };
      }

      const data = (await response.json().catch(() => ({}))) as EmailProviderResponse;

      return {
        status: 'sent',
        providerMessageId: this.getProviderMessageId(data),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown email provider failure';
      this.logger.error(`Transactional email provider threw: ${message}`);

      return {
        status: 'failed',
        error: 'email_provider_exception',
      };
    }
  }

  private async readErrorBody(response: Response): Promise<string> {
    const body = await response.text().catch(() => '');
    return body.slice(0, 300);
  }

  private getProviderMessageId(data: EmailProviderResponse): string | undefined {
    if (typeof data.messageId === 'string') {
      return data.messageId;
    }

    if (typeof data.id === 'string') {
      return data.id;
    }

    return undefined;
  }
}
