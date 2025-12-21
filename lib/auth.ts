import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export interface Permission {
  CREATE_USER: boolean;
  MANAGE_PRODUCTS: boolean;
  CREATE_INVOICE: boolean;
  MANAGE_CATEGORIES: boolean;
  VIEW_ALL_INVOICES: boolean;
  MANAGE_PATIENT: boolean;
  SYSTEM_ADMIN: boolean;
}

export const DEFAULT_PERMISSIONS: Permission = {
  CREATE_USER: false,
  MANAGE_PRODUCTS: false,
  CREATE_INVOICE: false,
  MANAGE_CATEGORIES: false,
  VIEW_ALL_INVOICES: false,
  MANAGE_PATIENT: false,
  SYSTEM_ADMIN: false,
};

export const SYSTEM_ADMIN_PERMISSIONS: Permission = {
  CREATE_USER: true,
  MANAGE_PRODUCTS: true,
  CREATE_INVOICE: true,
  MANAGE_CATEGORIES: true,
  VIEW_ALL_INVOICES: true,
  MANAGE_PATIENT: true,
  SYSTEM_ADMIN: true,
};

export function parsePermissions(permissionsString: string): Permission {
  try {
    return { ...DEFAULT_PERMISSIONS, ...JSON.parse(permissionsString) };
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}
