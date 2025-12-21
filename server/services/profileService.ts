import { hashPassword, verifyPassword } from '@/lib/auth';
import { findUserByEmail, updateUserPasswordByEmail } from '@/server/repositories/userRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';

export async function changePasswordForUser(
  payload: { currentPassword: string; newPassword: string },
  user?: SessionUser
) {
  if (!user?.id || !user.email) {
    throw new ServiceError('Unauthorized', 401);
  }

  if (!payload.currentPassword || !payload.newPassword) {
    throw new ServiceError('Both current and new passwords are required', 400);
  }

  if (payload.newPassword.length < 6) {
    throw new ServiceError('New password must be at least 6 characters long', 400);
  }

  const existingUser = await findUserByEmail(user.email);
  if (!existingUser) {
    throw new ServiceError('User not found', 404);
  }

  const isCurrentPasswordValid = await verifyPassword(payload.currentPassword, existingUser.password);
  if (!isCurrentPasswordValid) {
    throw new ServiceError('Current password is incorrect', 400);
  }

  const hashedNewPassword = await hashPassword(payload.newPassword);
  await updateUserPasswordByEmail(user.email, hashedNewPassword);

  return { success: true };
}
