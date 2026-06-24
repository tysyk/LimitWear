import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'test@example.com',
  })
  email!: string;

  @ApiProperty({
    example: 'Password1',
    minLength: 8,
  })
  password!: string;

  @ApiPropertyOptional({
    example: 'Test',
  })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'User',
  })
  lastName?: string;

  @ApiPropertyOptional({
    example: '+380000000000',
  })
  phone?: string;
}
