'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TailorForm({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jd, setJd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/resume/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, jobTitle, company, jobDescription: jd }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Tailoring failed');
      }
      router.push(`/applications/${data.application.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="jobTitle">
            Job title
          </label>
          <input
            id="jobTitle"
            className="input"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Senior Backend Engineer"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="company">
            Company
          </label>
          <input
            id="company"
            className="input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="jd">
          Job description
        </label>
        <textarea
          id="jd"
          className="input min-h-[260px] font-mono text-xs leading-relaxed"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the JD here..."
          required
          minLength={20}
        />
        <p className="mt-1 text-xs text-text-muted">
          Tailoring uses Claude. Make sure <code>ANTHROPIC_API_KEY</code> is set in the server
          environment.
        </p>
      </div>
      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Tailoring...' : 'Tailor with AI'}
        </button>
        {submitting ? (
          <span className="text-xs text-text-muted">
            Calling Claude — this usually takes 5–15 seconds.
          </span>
        ) : null}
      </div>
    </form>
  );
}
