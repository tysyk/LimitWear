import type { Request } from 'express';
import type { PublicUser } from '../../users/users.service';

export interface AuthenticatedRequest extends Request {
  user: PublicUser;
}
