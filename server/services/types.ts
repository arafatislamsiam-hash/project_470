export type PermissionSet = Partial<{
  CREATE_USER: boolean;
  MANAGE_PRODUCTS: boolean;
  CREATE_INVOICE: boolean;
  MANAGE_CATEGORIES: boolean;
  VIEW_ALL_INVOICES: boolean;
  MANAGE_PATIENT: boolean;
  SYSTEM_ADMIN: boolean;
}>;

export type SessionUser = {
  id: string;
  email?: string | null;
  permissions?: PermissionSet;
};
