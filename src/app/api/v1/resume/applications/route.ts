import { z } from 'zod';
import { fail, ok, parseJson } from '@/lib/api';
import { ApiError, ErrorCodes } from '@/lib/errors';
import {
  createApplication,
  getProfile,
  listApplications,
} from '@/lib/resume/store';
import { tailorResume } from '@/lib/resume/claude';
import { computeDiff, summarizeDiff } from '@/lib/resume/diff';

export const dynamic = 'force-dynamic';

const CreateBody = z.object({
  profileId: z.string().min(1),
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  jobDescription: z.string().min(20, 'Paste a fuller job description (>=20 chars)'),
});

export async function GET() {
  try {
    const apps = await listApplications();
    return ok({
      applications: apps.map((a) => ({
        id: a.id,
        profileId: a.profileId,
        profileSlug: a.profileSlug,
        profileDisplayName: a.profileDisplayName,
        jobTitle: a.jobTitle,
        company: a.company,
        status: a.status,
        pdfFilename: a.pdfFilename,
        createdAt: a.createdAt.toISOString(),
        finalizedAt: a.finalizedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson(req, CreateBody);
    const profile = await getProfile(body.profileId);
    if (!profile) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile not found');

    let tailored;
    try {
      tailored = await tailorResume({
        locked: profile.locked,
        editable: profile.editable,
        jobDescription: body.jobDescription,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tailoring failed';
      throw new ApiError(ErrorCodes.INTERNAL, `Claude tailoring failed: ${message}`);
    }

    const diff = computeDiff(profile.editable, tailored);
    const application = await createApplication({
      profileId: profile.id,
      jobTitle: body.jobTitle,
      company: body.company,
      jobDescription: body.jobDescription,
      original: profile.editable,
      tailored,
      diffSnapshot: { diff, summary: summarizeDiff(diff) },
    });

    return ok({ application }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
