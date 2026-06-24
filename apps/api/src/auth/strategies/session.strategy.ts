import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class SessionStrategy {
  validate(): never {
    throw new NotImplementedException(
      'Session strategy will be implemented with HttpOnly cookies in LW-016',
    );
  }
}
