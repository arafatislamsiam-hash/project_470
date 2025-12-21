import { Permission } from '@/lib/auth';

declare module 'next-auth' {
  interface User {
    permissions: Permission;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      permissions: Permission;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    permissions: Permission;
  }
}
