import { parsePermissions, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getServerSession, NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await verifyPassword(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Combine all permissions from user's roles
        const permissions = user.roles.reduce((acc, userRole) => {
          const rolePermissions = parsePermissions(userRole.role.permissions);
          return {
            CREATE_USER: acc.CREATE_USER || rolePermissions.CREATE_USER,
            MANAGE_PRODUCTS: acc.MANAGE_PRODUCTS || rolePermissions.MANAGE_PRODUCTS,
            CREATE_INVOICE: acc.CREATE_INVOICE || rolePermissions.CREATE_INVOICE,
            MANAGE_CATEGORIES: acc.MANAGE_CATEGORIES || rolePermissions.MANAGE_CATEGORIES,
            VIEW_ALL_INVOICES: acc.VIEW_ALL_INVOICES || rolePermissions.VIEW_ALL_INVOICES,
            MANAGE_PATIENT: acc.MANAGE_PATIENT || rolePermissions.MANAGE_PATIENT,
            SYSTEM_ADMIN: acc.SYSTEM_ADMIN || rolePermissions.SYSTEM_ADMIN,
          };
        }, {
          CREATE_USER: false,
          MANAGE_PRODUCTS: false,
          CREATE_INVOICE: false,
          MANAGE_CATEGORIES: false,
          VIEW_ALL_INVOICES: false,
          MANAGE_PATIENT: false,
          SYSTEM_ADMIN: false,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          permissions,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.permissions = token.permissions as any;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

export async function getSessionWithPermissions() {
  const session = await getServerSession(authOptions);
  return session;
}
