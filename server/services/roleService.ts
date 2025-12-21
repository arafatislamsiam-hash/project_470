import {
  createRole,
  deleteRole,
  findRoleById,
  findRoleByName,
  findUsersWithRole,
  listRoles,
  updateRole,
} from '@/server/repositories/roleRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';

type RolePayload = {
  id?: string;
  name: string;
  description?: string;
  permissions?: unknown;
};

function ensureUser(user?: SessionUser): asserts user is SessionUser {
  if (!user?.id) {
    throw new ServiceError('Unauthorized', 401);
  }
}

export async function getRoles(user?: SessionUser) {
  ensureUser(user);
  const roles = await listRoles();
  return { roles };
}

export async function createRoleForUser(payload: RolePayload, user?: SessionUser) {
  ensureUser(user);

  if (!payload.name) {
    throw new ServiceError('Name is required', 400);
  }

  const existingRole = await findRoleByName(payload.name);
  if (existingRole) {
    throw new ServiceError('Role with this name already exists', 409);
  }

  const role = await createRole({
    name: payload.name,
    description: payload.description,
    permissions: payload.permissions ? JSON.stringify(payload.permissions) : '',
  });

  return { role };
}

export async function updateRoleForUser(payload: RolePayload, user?: SessionUser) {
  ensureUser(user);

  if (!payload.id || !payload.name) {
    throw new ServiceError('ID and name are required', 400);
  }

  const existingRole = await findRoleById(payload.id);
  if (!existingRole) {
    throw new ServiceError('Role not found', 404);
  }

  const roleWithSameName = await findRoleByName(payload.name);
  if (roleWithSameName && roleWithSameName.id !== payload.id) {
    throw new ServiceError('Role with this name already exists', 409);
  }

  const role = await updateRole(payload.id, {
    name: payload.name,
    description: payload.description,
    permissions: payload.permissions ? JSON.stringify(payload.permissions) : '',
  });

  return { role };
}

export async function deleteRoleForUser(id: string, user?: SessionUser) {
  ensureUser(user);

  if (!id) {
    throw new ServiceError('Role ID is required', 400);
  }

  const existingRole = await findRoleById(id);
  if (!existingRole) {
    throw new ServiceError('Role not found', 404);
  }

  const usersWithRole = await findUsersWithRole(id);
  if (usersWithRole.length > 0) {
    throw new ServiceError('Cannot delete role that is assigned to users', 409);
  }

  await deleteRole(id);
}
