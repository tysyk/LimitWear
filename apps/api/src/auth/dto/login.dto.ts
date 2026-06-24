import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'test@example.com',
  })
  email!: string;

  @ApiProperty({
    example: 'Password1',
    minLength: 8,
  })
  password!: string;
}
