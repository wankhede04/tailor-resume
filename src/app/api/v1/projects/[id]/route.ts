import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireProjectAccess } from '@/lib/permissions';
import { ApiError, ErrorCodes } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireProjectAccess(user.id, ctx.params.id, 'viewer');

    const project = await prisma.project.findUnique({
      where: { id: ctx.params.id },
      include: {
        _count: { select: { tickets: { where: { archivedAt: null } } } },
        members: { include: { user: true } },
      },
    });
    if (!project) throw new ApiError(ErrorCodes.PROJECT_NOT_FOUND, 'Project not found');

    return ok({
      data: {
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description,
        ticketCount: project._count.tickets,
        members: project.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
        })),
      },
    });
  } catch (err) {
    return fail(err);
  }
}
