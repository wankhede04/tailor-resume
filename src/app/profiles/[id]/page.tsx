import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResumeNav } from '@/components/resume/Nav';
import { getProfile } from '@/lib/resume/store';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const profile = await getProfile(params.id);
  if (!profile) notFound();

  const factsById = new Map(profile.locked.experienceFacts.map((f) => [f.id, f]));

  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 text-xs text-text-muted">
          <Link href="/" className="hover:text-text-secondary">
            Profiles
          </Link>{' '}
          / {profile.slug}
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.displayName}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {profile.locked.contact.email}
              {profile.locked.contact.location ? ` · ${profile.locked.contact.location}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/profiles/${profile.id}/edit`} className="btn btn-secondary">
              Edit profile
            </Link>
            <Link href={`/profiles/${profile.id}/tailor`} className="btn btn-primary">
              Tailor for a job
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <section className="card">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                Summary
              </h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                editable
              </span>
            </div>
            <p className="text-sm leading-relaxed">{profile.editable.summary}</p>
          </section>

          <section className="card">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                Skills
              </h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                editable
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.editable.skills.map((s) => (
                <span
                  key={s.category}
                  className="rounded-full bg-bg-surface px-2 py-0.5 text-xs text-text-secondary"
                >
                  <strong>{s.category}:</strong> {s.items.join(', ')}
                </span>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                Experience
              </h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                facts locked · bullets editable
              </span>
            </div>
            <ul className="space-y-4">
              {profile.editable.experience.map((exp) => {
                const f = factsById.get(exp.id);
                if (!f) return null;
                return (
                  <li key={exp.id}>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-semibold">{f.title}</span>
                        <span className="text-text-secondary"> · {f.company}</span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {f.startDate} – {f.endDate}
                      </span>
                    </div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                      {exp.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>

          {profile.editable.projects.length > 0 ? (
            <section className="card">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Projects
                </h2>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                  editable
                </span>
              </div>
              <ul className="space-y-3">
                {profile.editable.projects.map((p) => (
                  <li key={p.id}>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-text-muted">{p.description}</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                      {p.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
              Education (locked)
            </h2>
            <ul className="space-y-2 text-sm">
              {profile.locked.education.map((e, i) => (
                <li key={i} className="flex items-baseline justify-between">
                  <span>
                    <span className="font-semibold">{e.degree}</span>
                    {e.field ? `, ${e.field}` : ''} · {e.institution}
                  </span>
                  <span className="text-xs text-text-muted">
                    {e.startYear ? `${e.startYear} – ` : ''}
                    {e.endYear}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
