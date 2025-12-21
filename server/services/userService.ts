import { hashPassword } from '@/lib/auth';
import { findRoleById } from '@/server/repositories/roleRepository';
import { createUser, findUserByEmail, listUsers } from '@/server/repositories/userRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';

type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  roleId: string;
};

function ensureUser(user?: SessionUser): asserts user is SessionUser {
  if (!user?.id) {
    throw new ServiceError('Unauthorized', 401);
  }
}

function ensureCanManageUsers(user: SessionUser) {
  if (!user.permissions?.CREATE_USER) {
    throw new ServiceError('Unauthorized', 401);
  }
}

export async function getUsersForSession(user?: SessionUser) {
  ensureUser(user);
  ensureCanManageUsers(user);

  const users = await listUsers();
  return { users };
}

export async function createUserForSession(payload: CreateUserPayload, user?: SessionUser) {
  ensureUser(user);
  ensureCanManageUsers(user);

  if (!payload.name || !payload.email || !payload.password || !payload.roleId) {
    throw new ServiceError('All fields are required', 400);
  }

  const existingUser = await findUserByEmail(payload.email);
  if (existingUser) {
    throw new ServiceError('User with this email already exists', 400);
  }

  const role = await findRoleById(payload.roleId);
  if (!role) {
    throw new ServiceError('Role not found', 400);
  }

  const hashedPassword = await hashPassword(payload.password);

  const createdUser = await createUser({
    name: payload.name,
    email: payload.email,
    password: hashedPassword,
    creator: { connect: { id: user.id } },
    roles: {
      create: {
        role: { connect: { id: payload.roleId } },
      },
    },
  });

  return { user: createdUser };
}
