'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

const SKILL_CATEGORIES = [
  'Expertise',
  'Web3 & Blockchain',
  'Developer Tooling & SDKs',
  'Backend & Distributed Systems',
  'Databases',
  'Cloud, Infra & DevOps',
  'Programming',
  'Frontend',
  'Monitoring & Observability',
  'Workstyle & Practices',
] as const;

function extractSkills(editable: unknown): string {
  if (!editable || typeof editable !== 'object') return '';
  const skills = (editable as Record<string, unknown>).skills;
  if (!Array.isArray(skills)) return '';
  return skills.join('\n');
}

function parseSkillsToMap(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return map;
}

function buildSkillsText(map: Record<string, string>): string {
  return SKILL_CATEGORIES
    .filter((cat) => map[cat]?.trim())
    .map((cat) => `${cat}: ${map[cat].trim()}`)
    .join('\n');
}

function splitSkills(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}


export function ProfileEditor({ mode, profileId, initial }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial.slug);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [lockedText, setLockedText] = useState(JSON.stringify(initial.locked, null, 2));
  const [editableText, setEditableText] = useState(JSON.stringify(initial.editable, null, 2));
  const [skillsText, setSkillsText] = useState(() => extractSkills(initial.editable));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSkillsChange(text: string) {
    setSkillsText(text);
    try {
      const parsed = JSON.parse(editableText);
      setEditableText(JSON.stringify({ ...parsed, skills: splitSkills(text) }, null, 2));
    } catch {
      // editableText is invalid JSON; skills will be merged on submit
    }
  }

  function onEditableChange(text: string) {
    setEditableText(text);
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.skills)) {
        setSkillsText(parsed.skills.join('\n'));
      }
    } catch {
      // don't sync skills from invalid JSON
    }
  }

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
        const parsed = JSON.parse(editableText);
        // Skills editor is authoritative
        editable = { ...parsed, skills: splitSkills(skillsText) };
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
    if (!window.confirm('Delete this profile and all its applications? This is irreversible.')) return;
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
          <label className="label" htmlFor="slug">Slug</label>
          <input
            id="slug"
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={mode === 'edit'}
            placeholder="vijay-backend"
            required
          />
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-text-muted">Slug is immutable after creation.</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="displayName">Display name</label>
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

      {/* Structured skills editor */}
      <div>
        <label className="label">Skills Summary</label>
        <p className="mb-3 text-xs text-text-muted">
          Fill in items for each category · format: <code className="text-text-secondary">item1, item2, item3</code>
        </p>
        <div className="space-y-2">
          {(() => {
            const map = parseSkillsToMap(skillsText);
            return SKILL_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-52 shrink-0 text-xs font-medium text-text-secondary">{cat}</span>
                <input
                  className="input flex-1 font-mono text-xs"
                  value={map[cat] ?? ''}
                  onChange={(e) => {
                    const updated = parseSkillsToMap(skillsText);
                    updated[cat] = e.target.value;
                    onSkillsChange(buildSkillsText(updated));
                  }}
                  placeholder="item1, item2, item3"
                />
              </div>
            ));
          })()}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="editable">
          Editable JSON (summary, experience bullets, projects — skills synced above)
        </label>
        <textarea
          id="editable"
          className="input min-h-[280px] font-mono text-xs leading-relaxed"
          value={editableText}
          onChange={(e) => onEditableChange(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : mode === 'create' ? 'Create profile' : 'Save changes'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost text-xs text-red-300 hover:text-red-200"
            disabled={busy}
          >
            Delete profile
          </button>
        )}
      </div>
    </form>
  );
}
