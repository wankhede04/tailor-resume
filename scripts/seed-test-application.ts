// One-off helper to seed a synthetic tailored application without an
// Anthropic call. Useful for local smoke tests of the diff review and
// PDF routes. Run: DATABASE_URL=file:./dev.db pnpm tsx scripts/seed-test-application.ts

import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';
import { EditableSchema, LockedSchema } from '../src/lib/resume/schema';
import { computeDiff, summarizeDiff } from '../src/lib/resume/diff';

const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.resumeProfile.findFirst({ where: { slug: 'anurag-fullstack' } });
  if (!profile) throw new Error('seed profile missing — run pnpm db:seed');

  const original = EditableSchema.parse(JSON.parse(profile.editableJson));
  LockedSchema.parse(JSON.parse(profile.lockedJson));

  const tailored = {
    ...original,
    summary:
      'Senior backend engineer with 4+ years building production web platforms across React, Node.js, and Postgres. Strong at owning APIs end-to-end, with a track record of latency wins.',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'AWS', 'gRPC', 'Kafka'],
    experience: original.experience.map((e, i) => ({
      ...e,
      bullets: e.bullets.map((b, j) =>
        i === 0 && j === 0
          ? 'Led migration of monolithic API to modular service boundaries; cut p95 latency from 480ms to 180ms across the fleet.'
          : b,
      ),
    })),
  };

  const diff = computeDiff(original, tailored);
  const snapshot = { diff, summary: summarizeDiff(diff) };

  const app = await prisma.resumeApplication.create({
    data: {
      id: `rap_${ulid()}`,
      profileId: profile.id,
      jobTitle: 'Senior Backend Engineer',
      company: 'Acme Corp',
      jobDescription:
        'We are looking for a senior backend engineer experienced with high-throughput services, Postgres, Kafka, gRPC, and operational excellence. Bonus: latency optimization, on-call leadership.',
      originalJson: JSON.stringify(original),
      tailoredJson: JSON.stringify(tailored),
      diffSnapshot: JSON.stringify(snapshot),
      status: 'draft',
    },
  });
  console.log(app.id);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
