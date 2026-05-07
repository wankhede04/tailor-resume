import { cookies } from 'next/headers';
import { prisma } from './db';
import { ApiError, ErrorCodes } from './errors';

export const SESSION_COOKIE = 'resume_user_id';

export async function getCurrentUser() {
  const c = cookies().get(SESSION_COOKIE);
  if (!c?.value) return null;
  return prisma.user.findUnique({ where: { id: c.value } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(ErrorCodes.UNAUTHORIZED, 'Not authenticated');
  }
  return user;
}
