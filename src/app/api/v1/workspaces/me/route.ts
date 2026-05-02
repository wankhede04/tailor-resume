import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            slackTeamId: true,
            plan: true,
          },
        },
      },
    });
    return ok({
      data: memberships.map((m) => ({ ...m.workspace, role: m.role })),
    });
  } catch (err) {
    return fail(err);
  }
}
