import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function WorkspaceHome({ params }: { params: { wid: string } }) {
  const workspace = await prisma.workspace.findUnique({ where: { id: params.wid } });
  const projects = await prisma.project.findMany({
    where: { workspaceId: params.wid, archivedAt: null },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { tickets: { where: { archivedAt: null } } } },
    },
  });

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">{workspace?.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {projects.length} project{projects.length === 1 ? '' : 's'} ·
          {' '}
          {workspace?.plan} plan
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-muted">
          Projects
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/workspace/${params.wid}/projects/${p.id}`}
              className="card transition-shadow hover:shadow-cardHover"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-bg-border px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                  {p.key}
                </span>
                <h3 className="text-base font-medium">{p.name}</h3>
              </div>
              {p.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
                  {p.description}
                </p>
              ) : null}
              <div className="mt-3 text-xs text-text-muted">
                {p._count.tickets} open ticket{p._count.tickets === 1 ? '' : 's'}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
