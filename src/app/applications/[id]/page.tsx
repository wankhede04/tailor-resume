import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResumeNav } from '@/components/resume/Nav';
import { getApplication, getProfile } from '@/lib/resume/store';
import { ReviewClient } from '@/components/resume/ReviewClient';

export const dynamic = 'force-dynamic';

export default async function ApplicationReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const application = await getApplication(params.id);
  if (!application) notFound();
  const profile = await getProfile(application.profileId);
  if (!profile) notFound();

  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 text-xs text-text-muted">
          <Link href="/" className="hover:text-text-secondary">
            Profiles
          </Link>{' '}
          /{' '}
          <Link href={`/profiles/${profile.id}`} className="hover:text-text-secondary">
            {profile.slug}
          </Link>{' '}
          / Review
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {application.jobTitle}{' '}
              <span className="text-text-secondary">@ {application.company}</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Reviewing tailored resume for{' '}
              <span className="text-text-primary">{profile.displayName}</span>. Accept lines you
              like, reject (revert) the ones you don&rsquo;t, or override any line inline.
            </p>
          </div>
          <span
            className={
              application.status === 'finalized'
                ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs uppercase tracking-wider text-emerald-300'
                : 'rounded-full bg-amber-500/10 px-2 py-0.5 text-xs uppercase tracking-wider text-amber-300'
            }
          >
            {application.status}
          </span>
        </div>

        <ReviewClient
          applicationId={application.id}
          profile={{ slug: profile.slug, locked: profile.locked }}
          original={application.original}
          tailored={application.tailored}
          status={application.status}
          pdfFilename={application.pdfFilename}
        />
      </div>
    </main>
  );
}
