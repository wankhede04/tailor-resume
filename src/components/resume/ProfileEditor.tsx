'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  mode: 'create' | 'edit';
  profileId?: string;
  initial: {
    slug: string;
    displayName: string;
    locked: unknown;
    editable: unknown;
  };
}

export function ProfileEditor({ mode, profileId, initial }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial.slug);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [lockedText, setLockedText] = useState(JSON.stringify(initial.locked, null, 2));
  const [editableText, setEditableText] = useState(JSON.stringify(initial.editable, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let locked: unknown;
      let editable: unknown;
      try {
        locked = JSON.parse(lockedText);
      } catch (err) {
        throw new Error(`Locked JSON is invalid: ${(err as Error).message}`);
      }
      try {
        editable = JSON.parse(editableText);
      } catch (err) {
        throw new Error(`Editable JSON is invalid: ${(err as Error).message}`);
      }

      if (mode === 'create') {
        const res = await fetch('/api/v1/resume/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, displayName, locked, editable }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message ?? 'Create failed');
        router.push(`/profiles/${data.profile.id}`);
      } else if (profileId) {
        const res = await fetch(`/api/v1/resume/profiles/${profileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, locked, editable }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message ?? 'Update failed');
        router.push(`/profiles/${profileId}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!profileId) return;
    if (!window.confirm('Delete this profile and all its applications? This is irreversible.')) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/resume/profiles/${profileId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Delete failed');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={mode === 'edit'}
            placeholder="vijay-backend"
            required
          />
          {mode === 'edit' ? (
            <p className="mt-1 text-xs text-text-muted">Slug is immutable after creation.</p>
          ) : null}
        </div>
        <div>
          <label className="label" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Vijay Wankhede"
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="locked">
          Locked JSON (facts; AI never modifies)
        </label>
        <textarea
          id="locked"
          className="input min-h-[280px] font-mono text-xs leading-relaxed"
          value={lockedText}
          onChange={(e) => setLockedText(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="editable">
          Editable JSON (summary, skills, experience bullets, projects)
        </label>
        <textarea
          id="editable"
          className="input min-h-[280px] font-mono text-xs leading-relaxed"
          value={editableText}
          onChange={(e) => setEditableText(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : mode === 'create' ? 'Create profile' : 'Save changes'}
        </button>
        {mode === 'edit' ? (
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost text-xs text-red-300 hover:text-red-200"
            disabled={busy}
          >
            Delete profile
          </button>
        ) : null}
      </div>
    </form>
  );
}
