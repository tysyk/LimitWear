import { ConfigService } from '@nestjs/config';
import { TelegramProviderService } from './telegram-provider.service';

describe('TelegramProviderService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends messages through the configured Telegram bot', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
    const service = new TelegramProviderService(
      new ConfigService({
        TELEGRAM_BOT_TOKEN: 'bot-token',
        TELEGRAM_BOT_API_BASE_URL: 'https://telegram.example',
      }),
    );

    await expect(
      service.sendMessage({
        telegramId: '123456',
        text: 'Order update',
      }),
    ).resolves.toEqual({
      status: 'sent',
      providerMessageId: '42',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://telegram.example/botbot-token/sendMessage');
    expect(init.method).toBe('POST');
    expect(init.body).toContain('"chat_id":"123456"');
    expect(init.body).toContain('"text":"Order update"');
  });

  it('returns failed when Telegram rejects the message', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, description: 'chat not found' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
    const service = new TelegramProviderService(
      new ConfigService({
        TELEGRAM_BOT_TOKEN: 'bot-token',
      }),
    );

    await expect(
      service.sendMessage({
        telegramId: 'missing-chat',
        text: 'Order update',
      }),
    ).resolves.toEqual({
      status: 'failed',
      error: 'telegram_provider_failed',
    });
  });

  it('skips without throwing when the bot token is missing', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const service = new TelegramProviderService(new ConfigService());

    await expect(
      service.sendMessage({
        telegramId: '123456',
        text: 'Order update',
      }),
    ).resolves.toEqual({
      status: 'skipped',
      error: 'telegram_bot_not_configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
