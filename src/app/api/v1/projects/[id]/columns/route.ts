import { z } from 'zod';
import { ok, fail, parseJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireProjectAccess } from '@/lib/permissions';
import { newId } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireProjectAccess(user.id, ctx.params.id, 'viewer');
    const cols = await prisma.workflowColumn.findMany({
      where: { projectId: ctx.params.id },
      orderBy: { position: 'asc' },
    });
    return ok({ data: cols });
  } catch (err) {
    return fail(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  category: z.enum(['todo', 'in_progress', 'done']),
  wipLimit: z.number().int().min(1).max(99).nullable().optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireProjectAccess(user.id, ctx.params.id, 'admin');
    const body = await parseJson(req, createSchema);

    const max = await prisma.workflowColumn.findFirst({
      where: { projectId: ctx.params.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const created = await prisma.workflowColumn.create({
      data: {
        id: newId('col'),
        projectId: ctx.params.id,
        name: body.name,
        category: body.category,
        wipLimit: body.wipLimit ?? null,
        position: (max?.position ?? -1) + 1,
      },
    });
    return ok({ data: created }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
