import { z } from 'zod';
import { ok, fail, parseJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireProjectAccess } from '@/lib/permissions';
import { ApiError, ErrorCodes } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  wipLimit: z.number().int().min(1).max(99).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const col = await prisma.workflowColumn.findUnique({
      where: { id: ctx.params.id },
      select: { projectId: true },
    });
    if (!col) throw new ApiError(ErrorCodes.COLUMN_NOT_FOUND, 'Column not found');
    await requireProjectAccess(user.id, col.projectId, 'admin');

    const body = await parseJson(req, patchSchema);
    const updated = await prisma.workflowColumn.update({
      where: { id: ctx.params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.wipLimit !== undefined ? { wipLimit: body.wipLimit } : {}),
      },
    });
    return ok({ data: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const col = await prisma.workflowColumn.findUnique({
      where: { id: ctx.params.id },
      select: { projectId: true },
    });
    if (!col) throw new ApiError(ErrorCodes.COLUMN_NOT_FOUND, 'Column not found');
    await requireProjectAccess(user.id, col.projectId, 'admin');

    const count = await prisma.ticket.count({
      where: { statusColumnId: ctx.params.id, archivedAt: null },
    });
    if (count > 0) {
      throw new ApiError(
        ErrorCodes.VALIDATION_FAILED,
        'Column must be empty before deletion',
      );
    }
    await prisma.workflowColumn.delete({ where: { id: ctx.params.id } });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
