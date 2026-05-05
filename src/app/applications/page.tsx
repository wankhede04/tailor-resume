import Link from 'next/link';
import { ResumeNav } from '@/components/resume/Nav';
import { listApplications } from '@/lib/resume/store';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toISOString().slice(0, 10);
}

export default async function ApplicationsPage() {
  const apps = await listApplications();
  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Every job we tailored a resume for, with the diff snapshot at finalization. Click a
              row to re-open the diff or re-download the PDF.
            </p>
          </div>
        </div>

        {apps.length === 0 ? (
          <div className="card text-center text-sm text-text-secondary">
            No applications yet. Pick a profile and tailor it for a job.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-bg-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-surface text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-2">Profile</th>
                  <th className="px-4 py-2">Job</th>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2">Finalized</th>
                  <th className="px-4 py-2">PDF</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-bg-border bg-bg-raised hover:bg-bg-surface"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/profiles/${a.profileId}`}
                        className="text-text-primary hover:text-accent"
                      >
                        {a.profileDisplayName}
                      </Link>
                      <div className="text-xs text-text-muted">{a.profileSlug}</div>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/applications/${a.id}`}
                        className="text-text-primary hover:text-accent"
                      >
                        {a.jobTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{a.company}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          a.status === 'finalized'
                            ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs uppercase tracking-wider text-emerald-300'
                            : 'rounded-full bg-amber-500/10 px-2 py-0.5 text-xs uppercase tracking-wider text-amber-300'
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-text-muted">{fmtDate(a.createdAt)}</td>
                    <td className="px-4 py-2 text-xs text-text-muted">
                      {fmtDate(a.finalizedAt)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {a.status === 'finalized' && a.pdfFilename ? (
                        <a
                          className="text-accent hover:text-accent-hover"
                          href={`/api/v1/resume/applications/${a.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.pdfFilename}
                        </a>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
