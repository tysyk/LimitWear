import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationSettingsDto {
  @ApiProperty({ required: false, example: true })
  emailEnabled?: boolean;

  @ApiProperty({ required: false, example: false })
  telegramEnabled?: boolean;

  @ApiProperty({ required: false, example: true })
  wishlistEnabled?: boolean;

  @ApiProperty({ required: false, example: true })
  secondChanceEnabled?: boolean;

  @ApiProperty({ required: false, example: false })
  marketingOptIn?: boolean;
}

export interface ValidatedNotificationSettingsInput {
  emailEnabled?: boolean;
  telegramEnabled?: boolean;
  wishlistEnabled?: boolean;
  secondChanceEnabled?: boolean;
  marketingOptIn?: boolean;
  inAppEnabled: true;
}

export function validateUpdateNotificationSettingsDto(
  dto: UpdateNotificationSettingsDto,
): ValidatedNotificationSettingsInput {
  return {
    emailEnabled: normalizeOptionalBoolean(dto.emailEnabled),
    telegramEnabled: normalizeOptionalBoolean(dto.telegramEnabled),
    wishlistEnabled: normalizeOptionalBoolean(dto.wishlistEnabled),
    secondChanceEnabled: normalizeOptionalBoolean(dto.secondChanceEnabled),
    marketingOptIn: normalizeOptionalBoolean(dto.marketingOptIn),
    inAppEnabled: true,
  };
}

function normalizeOptionalBoolean(value: boolean | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}
