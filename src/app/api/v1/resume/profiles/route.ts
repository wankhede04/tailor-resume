import { z } from 'zod';
import { fail, ok, parseJson } from '@/lib/api';
import { ApiError, ErrorCodes } from '@/lib/errors';
import { createProfile, getProfileBySlug, listProfiles } from '@/lib/resume/store';
import { EditableSchema, LockedSchema } from '@/lib/resume/schema';

export const dynamic = 'force-dynamic';

const CreateProfileBody = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
  displayName: z.string().min(1).optional(),
  locked: LockedSchema,
  editable: EditableSchema,
});

export async function GET() {
  try {
    const profiles = await listProfiles();
    return ok({
      profiles: profiles.map((p) => ({
        id: p.id,
        slug: p.slug,
        displayName: p.displayName,
        skillsCount: p.editable.skills.length,
        experienceCount: p.editable.experience.length,
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson(req, CreateProfileBody);
    const existing = await getProfileBySlug(body.slug);
    if (existing) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, `Profile slug '${body.slug}' already exists`);
    }
    const profile = await createProfile({
      slug: body.slug,
      displayName: body.displayName ?? body.locked.name,
      locked: body.locked,
      editable: body.editable,
    });
    return ok({ profile }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
