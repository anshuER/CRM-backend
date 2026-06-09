export type TenantContext = {
  organizationId: string;
  membershipId: string;
  role: 'ORG_ADMIN' | 'MANAGER' | 'EMPLOYEE';
};
