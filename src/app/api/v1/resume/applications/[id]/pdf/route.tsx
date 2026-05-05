import { renderToBuffer } from '@react-pdf/renderer';
import { fail } from '@/lib/api';
import { ApiError, ErrorCodes } from '@/lib/errors';
import { getApplication, getProfile } from '@/lib/resume/store';
import { ResumePdf } from '@/lib/resume/pdfDocument';

export const dynamic = 'force-dynamic';
// react-pdf uses Node APIs (fs, stream) — force the Node runtime, not Edge.
export const runtime = 'nodejs';

function pdfFilenameFor(slug: string, company: string, date: Date): string {
  const safeCompany = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const datePart = date.toISOString().slice(0, 10);
  return `${slug}_${safeCompany || 'company'}_${datePart}.pdf`;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const app = await getApplication(params.id);
    if (!app) throw new ApiError(ErrorCodes.NOT_FOUND, 'Application not found');
    const profile = await getProfile(app.profileId);
    if (!profile) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile not found');

    const filename =
      app.pdfFilename ?? pdfFilenameFor(profile.slug, app.company, app.finalizedAt ?? new Date());

    const buffer = await renderToBuffer(
      <ResumePdf locked={profile.locked} editable={app.tailored} />,
    );

    // Buffer is a Uint8Array subclass; the Web Response type wants
    // BodyInit (which accepts Uint8Array) — cast through Uint8Array for
    // strict TS compatibility.
    const body = new Uint8Array(buffer);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return fail(err);
  }
}
