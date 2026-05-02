import { z } from 'zod';
import { ok, fail, parseJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, ErrorCodes } from '@/lib/errors';
import { newId } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { wid: string } }) {
  try {
    const user = await requireUser();
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.params.wid, userId: user.id } },
    });
    if (!member) throw new ApiError(ErrorCodes.FORBIDDEN, 'Not a member of this workspace');

    const projects = await prisma.project.findMany({
      where: { workspaceId: ctx.params.wid, archivedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { tickets: { where: { archivedAt: null } } } } },
    });

    return ok({
      data: projects.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        ticketCount: p._count.tickets,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

const createSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(8)
    .regex(/^[A-Z][A-Z0-9]+$/, 'Project key must be uppercase letters/digits'),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export async function POST(req: Request, ctx: { params: { wid: string } }) {
  try {
    const user = await requireUser();
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.params.wid, userId: user.id } },
    });
    if (!member || member.role === 'viewer' || member.role === 'guest') {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Cannot create projects');
    }

    const body = await parseJson(req, createSchema);

    const project = await prisma.$transaction(async (tx) => {
      const id = newId('prj');
      const created = await tx.project.create({
        data: {
          id,
          workspaceId: ctx.params.wid,
          key: body.key,
          name: body.name,
          description: body.description ?? null,
        },
      });
      await tx.projectMember.create({
        data: { projectId: id, userId: user.id, role: 'admin' },
      });

      // Default columns: To Do / In Progress / Review / Done
      const defaults = [
        { name: 'To Do', category: 'todo', wipLimit: null },
        { name: 'In Progress', category: 'in_progress', wipLimit: 5 },
        { name: 'Review', category: 'in_progress', wipLimit: 3 },
        { name: 'Done', category: 'done', wipLimit: null },
      ];
      let position = 0;
      for (const c of defaults) {
        await tx.workflowColumn.create({
          data: {
            id: newId('col'),
            projectId: id,
            name: c.name,
            category: c.category,
            wipLimit: c.wipLimit,
            position: position++,
          },
        });
      }
      return created;
    });

    return ok({ data: project }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
