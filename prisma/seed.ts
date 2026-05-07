import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';
import { SAMPLE_PROFILES } from '../src/lib/resume/seedData';

const prisma = new PrismaClient();

const id = (prefix: string) => `${prefix}_${ulid()}`;

async function main() {
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

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
