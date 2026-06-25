import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DesignStatus } from '../schemas/design.schema';

export const REVIEW_DESIGN_STATUSES = [
  DesignStatus.Approved,
  DesignStatus.Rejected,
  DesignStatus.NeedsChanges,
] as const;

export type ReviewDesignStatus = (typeof REVIEW_DESIGN_STATUSES)[number];

export class ReviewDesignDto {
  @ApiProperty({
    enum: REVIEW_DESIGN_STATUSES,
    example: DesignStatus.Approved,
  })
  status!: ReviewDesignStatus;

  @ApiPropertyOptional({
    example: 'Please adjust the mockup contrast and resubmit.',
  })
  adminComment?: string;

  @ApiPropertyOptional({
    example: 'Artwork contains copyrighted material.',
  })
  rejectionReason?: string;
}
