import { renderToBuffer } from '@react-pdf/renderer';
import { fail } from '@/lib/api';
import { ApiError, ErrorCodes } from '@/lib/errors';
import { getApplication, getProfile } from '@/lib/resume/store';
import { resolveTemplate, isValidTemplateId, DEFAULT_TEMPLATE_ID } from '@/lib/resume/templates';

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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const app = await getApplication(params.id);
    if (!app) throw new ApiError(ErrorCodes.NOT_FOUND, 'Application not found');
    const profile = await getProfile(app.profileId);
    if (!profile) throw new ApiError(ErrorCodes.NOT_FOUND, 'Profile not found');

    const url = new URL(req.url);
    const inline = url.searchParams.get('inline') === 'true';
    const rawTemplate = url.searchParams.get('template');
    const templateId = isValidTemplateId(rawTemplate) ? rawTemplate : DEFAULT_TEMPLATE_ID;
    const Template = resolveTemplate(templateId);

    const filename =
      app.pdfFilename ?? pdfFilenameFor(profile.slug, app.company, app.finalizedAt ?? new Date());

    const buffer = await renderToBuffer(
      <Template locked={profile.locked} editable={app.tailored} />,
    );

    const body = new Uint8Array(buffer);
    const disposition = inline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return fail(err);
  }
}
