import { ok, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null, workspaces: [] });
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
    });
    return ok({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })),
    });
  } catch (err) {
    return fail(err);
  }
}
