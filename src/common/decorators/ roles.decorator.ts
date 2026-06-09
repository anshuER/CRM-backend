import { SetMetadata } from '@nestjs/common';
import { Role } from '../constant/roles.constant';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const RequiredRoles = (...roles: Role[]) => {
  return SetMetadata(REQUIRED_ROLES_KEY, roles);
};
