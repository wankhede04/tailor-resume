import { prisma } from '@/lib/db';
import { newId } from '@/lib/ids';
import {
  EditableSchema,
  LockedSchema,
  type EditableResume,
  type LockedResume,
} from './schema';

export interface ProfileRecord {
  id: string;
  slug: string;
  displayName: string;
  locked: LockedResume;
  editable: EditableResume;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationRecord {
  id: string;
  profileId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  original: EditableResume;
  tailored: EditableResume;
  diffSnapshot: unknown;
  status: 'draft' | 'finalized';
  pdfFilename: string | null;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function decodeProfile(row: {
  id: string;
  slug: string;
  displayName: string;
  lockedJson: string;
  editableJson: string;
  createdAt: Date;
  updatedAt: Date;
}): ProfileRecord {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    locked: LockedSchema.parse(JSON.parse(row.lockedJson)),
    editable: EditableSchema.parse(JSON.parse(row.editableJson)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function decodeApplication(row: {
  id: string;
  profileId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  originalJson: string;
  tailoredJson: string;
  diffSnapshot: string;
  status: string;
  pdfFilename: string | null;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ApplicationRecord {
  return {
    id: row.id,
    profileId: row.profileId,
    jobTitle: row.jobTitle,
    company: row.company,
    jobDescription: row.jobDescription,
    original: EditableSchema.parse(JSON.parse(row.originalJson)),
    tailored: EditableSchema.parse(JSON.parse(row.tailoredJson)),
    diffSnapshot: row.diffSnapshot ? JSON.parse(row.diffSnapshot) : {},
    status: row.status === 'finalized' ? 'finalized' : 'draft',
    pdfFilename: row.pdfFilename,
    finalizedAt: row.finalizedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listProfiles(): Promise<ProfileRecord[]> {
  const rows = await prisma.resumeProfile.findMany({ orderBy: { createdAt: 'asc' } });
  return rows.map(decodeProfile);
}

export async function getProfile(id: string): Promise<ProfileRecord | null> {
  const row = await prisma.resumeProfile.findUnique({ where: { id } });
  return row ? decodeProfile(row) : null;
}

export async function getProfileBySlug(slug: string): Promise<ProfileRecord | null> {
  const row = await prisma.resumeProfile.findUnique({ where: { slug } });
  return row ? decodeProfile(row) : null;
}

export async function createProfile(input: {
  slug: string;
  displayName: string;
  locked: LockedResume;
  editable: EditableResume;
}): Promise<ProfileRecord> {
  const row = await prisma.resumeProfile.create({
    data: {
      id: newId('rpf'),
      slug: input.slug,
      displayName: input.displayName,
      lockedJson: JSON.stringify(input.locked),
      editableJson: JSON.stringify(input.editable),
    },
  });
  return decodeProfile(row);
}

export async function updateProfile(
  id: string,
  patch: Partial<{ displayName: string; locked: LockedResume; editable: EditableResume }>,
): Promise<ProfileRecord | null> {
  const data: Record<string, unknown> = {};
  if (patch.displayName !== undefined) data.displayName = patch.displayName;
  if (patch.locked) data.lockedJson = JSON.stringify(patch.locked);
  if (patch.editable) data.editableJson = JSON.stringify(patch.editable);
  const row = await prisma.resumeProfile.update({ where: { id }, data });
  return decodeProfile(row);
}

export async function deleteProfile(id: string): Promise<void> {
  await prisma.resumeProfile.delete({ where: { id } });
}

export async function createApplication(input: {
  profileId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  original: EditableResume;
  tailored: EditableResume;
  diffSnapshot: unknown;
}): Promise<ApplicationRecord> {
  const row = await prisma.resumeApplication.create({
    data: {
      id: newId('rap'),
      profileId: input.profileId,
      jobTitle: input.jobTitle,
      company: input.company,
      jobDescription: input.jobDescription,
      originalJson: JSON.stringify(input.original),
      tailoredJson: JSON.stringify(input.tailored),
      diffSnapshot: JSON.stringify(input.diffSnapshot),
      status: 'draft',
    },
  });
  return decodeApplication(row);
}

export async function getApplication(id: string): Promise<ApplicationRecord | null> {
  const row = await prisma.resumeApplication.findUnique({ where: { id } });
  return row ? decodeApplication(row) : null;
}

export async function listApplications(): Promise<
  (ApplicationRecord & { profileSlug: string; profileDisplayName: string })[]
> {
  const rows = await prisma.resumeApplication.findMany({
    orderBy: { createdAt: 'desc' },
    include: { profile: { select: { slug: true, displayName: true } } },
  });
  return rows.map((r) => ({
    ...decodeApplication(r),
    profileSlug: r.profile.slug,
    profileDisplayName: r.profile.displayName,
  }));
}

export async function updateApplicationTailored(
  id: string,
  tailored: EditableResume,
  diffSnapshot: unknown,
): Promise<ApplicationRecord | null> {
  const row = await prisma.resumeApplication.update({
    where: { id },
    data: {
      tailoredJson: JSON.stringify(tailored),
      diffSnapshot: JSON.stringify(diffSnapshot),
    },
  });
  return decodeApplication(row);
}

export async function finalizeApplication(
  id: string,
  pdfFilename: string,
): Promise<ApplicationRecord | null> {
  const row = await prisma.resumeApplication.update({
    where: { id },
    data: {
      status: 'finalized',
      pdfFilename,
      finalizedAt: new Date(),
    },
  });
  return decodeApplication(row);
}
