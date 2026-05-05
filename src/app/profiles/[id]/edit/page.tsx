import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResumeNav } from '@/components/resume/Nav';
import { ProfileEditor } from '@/components/resume/ProfileEditor';
import { getProfile } from '@/lib/resume/store';

export const dynamic = 'force-dynamic';

export default async function EditProfilePage({ params }: { params: { id: string } }) {
  const profile = await getProfile(params.id);
  if (!profile) notFound();

  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 text-xs text-text-muted">
          <Link href="/" className="hover:text-text-secondary">
            Profiles
          </Link>{' '}
          /{' '}
          <Link href={`/profiles/${profile.id}`} className="hover:text-text-secondary">
            {profile.slug}
          </Link>{' '}
          / Edit
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit profile</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Modify the locked or editable sections directly. Locked changes apply to future
          tailorings; the AI will not alter them at runtime.
        </p>
        <div className="mt-6">
          <ProfileEditor
            mode="edit"
            profileId={profile.id}
            initial={{
              slug: profile.slug,
              displayName: profile.displayName,
              locked: profile.locked,
              editable: profile.editable,
            }}
          />
        </div>
      </div>
    </main>
  );
}
