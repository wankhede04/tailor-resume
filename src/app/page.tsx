import Link from 'next/link';
import { listProfiles, listApplications } from '@/lib/resume/store';
import { ResumeNav } from '@/components/resume/Nav';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [profiles, applications] = await Promise.all([listProfiles(), listApplications()]);
  const appsByProfile = new Map<string, number>();
  for (const a of applications) {
    appsByProfile.set(a.profileId, (appsByProfile.get(a.profileId) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Profiles</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Canonical resume JSON for each candidate. Locked sections are facts; editable
              sections are what the AI tailors against the JD.
            </p>
          </div>
          <Link href="/profiles/new" className="btn btn-primary">
            New profile
          </Link>
        </div>

        {profiles.length === 0 ? (
          <div className="card text-center text-sm text-text-secondary">
            No profiles yet. Run <code className="text-text-primary">pnpm db:seed</code> or click
            &ldquo;New profile&rdquo; to add one.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/profiles/${p.id}`}
                  className="card block transition-shadow hover:shadow-cardHover"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{p.displayName}</div>
                      <div className="mt-0.5 text-xs text-text-muted">{p.slug}</div>
                    </div>
                    <span className="text-xs text-text-muted">
                      {appsByProfile.get(p.id) ?? 0} apps
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-text-secondary">
                    {p.editable.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.editable.skills.flatMap((s) => s.items).slice(0, 6).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-bg-surface px-2 py-0.5 text-xs text-text-secondary"
                      >
                        {item}
                      </span>
                    ))}
                    {p.editable.skills.flatMap((s) => s.items).length > 6 ? (
                      <span className="rounded-full px-2 py-0.5 text-xs text-text-muted">
                        +{p.editable.skills.flatMap((s) => s.items).length - 6}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

      </div>
    </main>
  );
}
