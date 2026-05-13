import { z } from 'zod';
import { fail, ok, parseJson } from '@/lib/api';
import { ApiError, ErrorCodes } from '@/lib/errors';
import {
  finalizeApplication,
  getApplication,
  getProfile,
  updateApplicationTailored,
  updateCoverLetter,
} from '@/lib/resume/store';
import { EditableSchema } from '@/lib/resume/schema';
import { computeDiff, summarizeDiff } from '@/lib/resume/diff';

export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  tailored: EditableSchema,
  coverLetter: z.string().optional(),
  finalize: z.boolean().optional().default(false),
});


export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const app = await getApplication(params.id);
    if (!app) throw new ApiError(ErrorCodes.NOT_FOUND, 'Application not found');
    const profile = await getProfile(app.profileId);
    if (!profile) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile for application not found');
    return ok({
      application: app,
      profile: { id: profile.id, slug: profile.slug, locked: profile.locked },
      diff: computeDiff(app.original, app.tailored),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseJson(req, PatchBody);
    const app = await getApplication(params.id);
    if (!app) throw new ApiError(ErrorCodes.NOT_FOUND, 'Application not found');
    if (app.status === 'finalized') {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, 'Application is already finalized');
    }

    const diff = computeDiff(app.original, body.tailored);
    const snapshot = { diff, summary: summarizeDiff(diff) };
    let updated = await updateApplicationTailored(params.id, body.tailored, snapshot);
    if (!updated) throw new ApiError(ErrorCodes.NOT_FOUND, 'Application not found after update');
    if (body.coverLetter !== undefined) {
      updated = await updateCoverLetter(params.id, body.coverLetter) ?? updated;
    }

    if (body.finalize) {
      updated = await finalizeApplication(params.id) ?? updated;
    }

    return ok({ application: updated });
  } catch (err) {
    return fail(err);
  }
}
