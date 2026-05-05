import { z } from 'zod';
import { fail, ok, parseJson } from '@/lib/api';
import { ApiError, ErrorCodes } from '@/lib/errors';
import { deleteProfile, getProfile, updateProfile } from '@/lib/resume/store';
import { EditableSchema, LockedSchema } from '@/lib/resume/schema';

export const dynamic = 'force-dynamic';

const PatchBody = z
  .object({
    displayName: z.string().min(1).optional(),
    locked: LockedSchema.optional(),
    editable: EditableSchema.optional(),
  })
  .refine(
    (b) => b.displayName !== undefined || b.locked !== undefined || b.editable !== undefined,
    'At least one of displayName, locked, editable is required',
  );

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const profile = await getProfile(params.id);
    if (!profile) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile not found');
    return ok({ profile });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJson(req, PatchBody);
    const existing = await getProfile(params.id);
    if (!existing) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile not found');
    const updated = await updateProfile(params.id, body);
    return ok({ profile: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await getProfile(params.id);
    if (!existing) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile not found');
    await deleteProfile(params.id);
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
