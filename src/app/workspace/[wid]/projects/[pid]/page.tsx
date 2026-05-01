import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getBoardSnapshot } from '@/lib/board';
import { BoardClient } from '@/components/board/BoardClient';

export const dynamic = 'force-dynamic';

export default async function ProjectBoardPage({
  params,
}: {
  params: { wid: string; pid: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const board = await getBoardSnapshot(params.pid);
  if (!board) redirect(`/workspace/${params.wid}`);

  // Members for the assignee picker.
  const members = await prisma.projectMember.findMany({
    where: { projectId: params.pid },
    include: { user: true },
  });

  const labels = await prisma.label.findMany({ where: { projectId: params.pid } });

  return (
    <BoardClient
      initialBoard={board}
      members={members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
      }))}
      labels={labels}
      currentUserId={user.id}
    />
  );
}
