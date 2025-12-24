import {
  createCategory,
  findCategoryByTitle,
  listCategories,
} from '@/server/repositories/categoryRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';

export async function getCategories(user?: SessionUser) {
  if (!user?.id) {
    throw new ServiceError('Unauthorized', 401);
  }

  const categories = await listCategories();
  return { categories };
}

export async function createCategoryForUser(
  payload: { title: string; description?: string },
  user?: SessionUser
) {
  if (!user?.id || !user.permissions?.MANAGE_CATEGORIES) {
    throw new ServiceError('Unauthorized', 401);
  }

  if (!payload.title) {
    throw new ServiceError('Title is required', 400);
  }

  const existingCategory = await findCategoryByTitle(payload.title);
  if (existingCategory) {
    throw new ServiceError('Category with this title already exists', 400);
  }

  const category = await createCategory({
    title: payload.title,
    description: payload.description || null,
    isDefault: false,
  });

  return { category };
}
