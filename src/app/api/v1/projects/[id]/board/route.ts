import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { requireProjectAccess } from '@/lib/permissions';
import { getBoardSnapshot } from '@/lib/board';
import { ApiError, ErrorCodes } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireProjectAccess(user.id, ctx.params.id, 'viewer');
    const board = await getBoardSnapshot(ctx.params.id);
    if (!board) throw new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found');
    return ok({ data: board });
  } catch (err) {
    return fail(err);
  }
}
