import { fail, ok } from '@/lib/api';
import { ApiError, ErrorCodes } from '@/lib/errors';
import { getApplication, getProfile, updateCoverLetter } from '@/lib/resume/store';
import { generateCoverLetter } from '@/lib/resume/claude';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const app = await getApplication(params.id);
    if (!app) throw new ApiError(ErrorCodes.NOT_FOUND, 'Application not found');
    const profile = await getProfile(app.profileId);
    if (!profile) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile not found');

    const text = await generateCoverLetter({
      locked: profile.locked,
      editable: app.tailored,
      jobTitle: app.jobTitle,
      company: app.company,
      jobDescription: app.jobDescription,
    });

    await updateCoverLetter(app.id, text);
    return ok({ coverLetter: text });
  } catch (err) {
    return fail(err);
  }
}
