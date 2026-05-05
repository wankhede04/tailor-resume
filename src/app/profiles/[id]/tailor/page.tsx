import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResumeNav } from '@/components/resume/Nav';
import { getProfile } from '@/lib/resume/store';
import { TailorForm } from '@/components/resume/TailorForm';

export const dynamic = 'force-dynamic';

export default async function TailorPage({ params }: { params: { id: string } }) {
  const profile = await getProfile(params.id);
  if (!profile) notFound();

  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 text-xs text-text-muted">
          <Link href="/" className="hover:text-text-secondary">
            Profiles
          </Link>{' '}
          /{' '}
          <Link href={`/profiles/${profile.id}`} className="hover:text-text-secondary">
            {profile.slug}
          </Link>{' '}
          / Tailor
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Tailor for a job</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Paste the job description below. Claude will rewrite the editable sections of{' '}
          <span className="text-text-primary">{profile.displayName}</span>&rsquo;s resume to match.
          You&rsquo;ll review every change in a diff before exporting the PDF.
        </p>
        <div className="mt-6">
          <TailorForm profileId={profile.id} />
        </div>
      </div>
    </main>
  );
}
