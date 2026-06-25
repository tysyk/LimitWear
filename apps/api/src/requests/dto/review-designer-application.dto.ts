import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus } from '@limitwear/shared';

export const REVIEW_DESIGNER_APPLICATION_STATUSES = [
  RequestStatus.Approved,
  RequestStatus.Rejected,
  RequestStatus.NeedsChanges,
] as const;

export type ReviewDesignerApplicationStatus = (typeof REVIEW_DESIGNER_APPLICATION_STATUSES)[number];

export class ReviewDesignerApplicationDto {
  @ApiProperty({
    enum: REVIEW_DESIGNER_APPLICATION_STATUSES,
    example: RequestStatus.Approved,
  })
  status!: ReviewDesignerApplicationStatus;

  @ApiPropertyOptional({
    example: 'Please add links to real portfolio examples.',
  })
  adminComment?: string;

  @ApiPropertyOptional({
    example: 'Portfolio does not match the current LimitWear designer criteria.',
  })
  rejectionReason?: string;
}
