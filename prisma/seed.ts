/**
 * Demo seed — TechSpec §19.3.
 *
 * Creates: 1 workspace, 1 project, 4 columns, 3 users, ~30 tickets
 * spread across columns and assignees, sample labels and comments.
 *
 * Idempotent: re-running upserts the workspace/users and clears tickets.
 */

import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';
import { generateNKeysBetween } from 'fractional-indexing';
import { SAMPLE_PROFILES } from '../src/lib/resume/seedData';

const prisma = new PrismaClient();

const id = (prefix: string) => `${prefix}_${ulid()}`;

async function seedResumeProfiles() {
  for (const p of SAMPLE_PROFILES) {
    await prisma.resumeProfile.upsert({
      where: { slug: p.profileId },
      update: {
        displayName: p.locked.name,
        lockedJson: JSON.stringify(p.locked),
        editableJson: JSON.stringify(p.editable),
      },
      create: {
        id: id('rpf'),
        slug: p.profileId,
        displayName: p.locked.name,
        lockedJson: JSON.stringify(p.locked),
        editableJson: JSON.stringify(p.editable),
      },
    });
  }
  console.log(`Seeded ${SAMPLE_PROFILES.length} resume profiles.`);
}

async function main() {
  const seedEmail = process.env.SEED_USER_EMAIL ?? 'demo@flowboard.app';
  const seedName = process.env.SEED_USER_NAME ?? 'Demo User';

  // Reset just the demo workspace's data so re-runs are deterministic.
  const existing = await prisma.workspace.findUnique({ where: { slug: 'demo' } });
  if (existing) {
    await prisma.workspace.delete({ where: { id: existing.id } });
  }

  const wsId = id('wsp');
  const workspace = await prisma.workspace.create({
    data: {
      id: wsId,
      name: 'Demo Workspace',
      slug: 'demo',
      plan: 'pro',
    },
  });

  const users = await Promise.all(
    [
      { email: seedEmail, name: seedName },
      { email: 'priya@flowboard.app', name: 'Priya Shah' },
      { email: 'marcus@flowboard.app', name: 'Marcus Allen' },
      { email: 'lena@flowboard.app', name: 'Lena Park' },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name },
        create: { id: id('usr'), email: u.email, name: u.name, timezone: 'America/Los_Angeles' },
      }),
    ),
  );

  const [demoUser, priya, marcus, lena] = users;

  await prisma.workspaceMember.createMany({
    data: users.map((u, i) => ({
      workspaceId: wsId,
      userId: u.id,
      role: i === 0 ? 'admin' : 'member',
    })),
  });

  const projectId = id('prj');
  await prisma.project.create({
    data: {
      id: projectId,
      workspaceId: wsId,
      key: 'FB',
      name: 'FlowBoard MVP',
      description: 'Build the v1 of the Slack-native Kanban tracker per TechSpec.',
    },
  });
  await prisma.projectMember.createMany({
    data: users.map((u, i) => ({
      projectId,
      userId: u.id,
      role: i === 0 ? 'admin' : 'member',
    })),
  });

  const columnDefs: Array<{
    name: string;
    category: 'todo' | 'in_progress' | 'done';
    wipLimit: number | null;
  }> = [
    { name: 'Backlog', category: 'todo', wipLimit: null },
    { name: 'In Progress', category: 'in_progress', wipLimit: 5 },
    { name: 'Review', category: 'in_progress', wipLimit: 3 },
    { name: 'Done', category: 'done', wipLimit: null },
  ];
  const columns = await Promise.all(
    columnDefs.map((c, i) =>
      prisma.workflowColumn.create({
        data: {
          id: id('col'),
          projectId,
          name: c.name,
          category: c.category,
          position: i,
          wipLimit: c.wipLimit,
        },
      }),
    ),
  );

  const labelDefs = [
    { name: 'bug', color: '#ef4444' },
    { name: 'feature', color: '#6366f1' },
    { name: 'infra', color: '#14b8a6' },
    { name: 'docs', color: '#a78bfa' },
    { name: 'spike', color: '#f59e0b' },
  ];
  const labels = await Promise.all(
    labelDefs.map((l) =>
      prisma.label.create({
        data: { id: id('lbl'), projectId, name: l.name, color: l.color },
      }),
    ),
  );

  const ticketTitles = [
    { col: 0, title: 'Set up monorepo and tooling', priority: 'high', labels: ['infra'] },
    { col: 0, title: 'Spike: evaluate dnd-kit vs alternatives', priority: 'medium', labels: ['spike'] },
    { col: 0, title: 'Define Postgres schema & migrations', priority: 'high', labels: ['infra'] },
    { col: 0, title: 'Slack OAuth install flow', priority: 'medium', labels: ['feature'] },
    { col: 0, title: 'Notification preferences UI', priority: 'low', labels: ['feature'] },
    { col: 0, title: 'Document API contract in OpenAPI', priority: 'medium', labels: ['docs'] },
    { col: 0, title: 'Saved filters + smart views', priority: 'low', labels: ['feature'] },
    { col: 0, title: 'Email magic-link auth', priority: 'medium', labels: ['feature'] },
    { col: 0, title: 'Quiet hours scheduling', priority: 'low', labels: ['feature'] },
    { col: 0, title: 'Audit log retention policy', priority: 'lowest', labels: ['infra'] },
    { col: 1, title: 'Implement ticket transition + WIP limits', priority: 'urgent', labels: ['feature'] },
    { col: 1, title: 'Fractional indexing helper + tests', priority: 'high', labels: ['feature'] },
    { col: 1, title: 'Board snapshot endpoint optimization', priority: 'high', labels: ['feature'] },
    { col: 1, title: 'Optimistic locking on ticket PATCH', priority: 'high', labels: ['feature'] },
    { col: 2, title: 'Code review: comment threads', priority: 'medium', labels: ['feature'] },
    { col: 2, title: 'QA: drag-and-drop edge cases', priority: 'high', labels: ['bug'] },
    { col: 3, title: 'Init Prisma + SQLite local dev', priority: 'medium', labels: ['infra'] },
    { col: 3, title: 'Tailwind theme + design tokens', priority: 'low', labels: ['feature'] },
    { col: 3, title: 'Health & readiness endpoints', priority: 'lowest', labels: ['infra'] },
    { col: 3, title: 'Workspace + project scaffolding', priority: 'medium', labels: ['feature'] },
  ];

  const ranksPerColumn: Record<string, string[]> = {};
  for (let i = 0; i < columns.length; i++) {
    const ticketsInCol = ticketTitles.filter((t) => t.col === i).length;
    ranksPerColumn[columns[i].id] = generateNKeysBetween(null, null, Math.max(ticketsInCol, 1));
  }

  const labelByName = new Map(labels.map((l) => [l.name, l]));
  const colCounters: Record<string, number> = {};

  let seq = 0;
  for (const t of ticketTitles) {
    seq += 1;
    const col = columns[t.col];
    colCounters[col.id] = (colCounters[col.id] ?? 0);
    const rank = ranksPerColumn[col.id][colCounters[col.id]];
    colCounters[col.id]++;

    const ticketId = id('tkt');
    const assignees = pickAssignees(seq, [priya.id, marcus.id, lena.id, demoUser.id]);
    const dueDate = pickDueDate(seq);

    await prisma.ticket.create({
      data: {
        id: ticketId,
        workspaceId: wsId,
        projectId,
        number: seq,
        title: t.title,
        description: `Detailed work for **${t.title}**.\n\nSee TechSpec for context.`,
        statusColumnId: col.id,
        priority: t.priority,
        reporterId: demoUser.id,
        rank,
        dueDate,
      },
    });

    await prisma.ticketAssignee.createMany({
      data: assignees.map((userId) => ({ ticketId, userId })),
    });
    await prisma.ticketWatcher.createMany({
      data: [demoUser.id, ...assignees]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((userId) => ({ ticketId, userId })),
    });

    if (t.labels?.length) {
      await prisma.ticketLabel.createMany({
        data: t.labels
          .map((n) => labelByName.get(n))
          .filter((l): l is NonNullable<typeof l> => !!l)
          .map((l) => ({ ticketId, labelId: l.id })),
      });
    }

    await prisma.activityEvent.create({
      data: {
        id: id('evt'),
        ticketId,
        actorId: demoUser.id,
        eventType: 'ticket_created',
        payload: JSON.stringify({ title: t.title }),
      },
    });

    if (seq % 4 === 0) {
      await prisma.comment.create({
        data: {
          id: id('cmt'),
          ticketId,
          authorId: assignees[0] ?? demoUser.id,
          body: 'Started looking at this — first pass coming today.',
        },
      });
      await prisma.activityEvent.create({
        data: {
          id: id('evt'),
          ticketId,
          actorId: assignees[0] ?? demoUser.id,
          eventType: 'comment_added',
          payload: JSON.stringify({}),
        },
      });
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { ticketSeq: seq },
  });

  console.log(`Seeded workspace ${workspace.slug} with ${seq} tickets.`);
  console.log(`Sign in as: ${seedEmail}`);

  await seedResumeProfiles();
}

function pickAssignees(seed: number, pool: string[]): string[] {
  if (seed % 5 === 0) return [];
  if (seed % 3 === 0) return [pool[seed % pool.length], pool[(seed + 1) % pool.length]];
  return [pool[seed % pool.length]];
}

function pickDueDate(seed: number): Date | null {
  if (seed % 3 === 0) return null;
  const offset = ((seed * 7) % 21) - 5; // -5..15 days from today
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
