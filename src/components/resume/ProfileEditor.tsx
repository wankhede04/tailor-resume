'use client';

import { useEffect, useRef, useState } from 'react';
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

function extractSkills(editable: unknown): string {
  if (!editable || typeof editable !== 'object') return '';
  const skills = (editable as Record<string, unknown>).skills;
  if (!Array.isArray(skills)) return '';
  return skills.join('\n');
}

function parseSkillLine(line: string): { category: string | null; items: string } {
  const idx = line.indexOf(':');
  if (idx === -1) return { category: null, items: line.trim() };
  return { category: line.slice(0, idx).trim(), items: line.slice(idx + 1).trim() };
}

function splitSkills(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Auto-growing textarea
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      style={{ overflow: 'hidden' }}
      className={className}
    />
  );
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

  const skillLines = splitSkills(skillsText);

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
        <p className="mb-2 text-xs text-text-muted">
          One category per line · format: <code className="text-text-secondary">Category: item1, item2, item3</code>
        </p>
        <div className="space-y-2">
          <AutoTextarea
            value={skillsText}
            onChange={onSkillsChange}
            placeholder={'Expertise: NodeJS, TypeScript/JavaScript, NestJS, Express\nWeb3 & Blockchain: Ethereum, Solidity, Polygon\nDatabases: PostgreSQL, MongoDB, Redis'}
            className="input min-h-[120px] font-mono text-xs leading-relaxed"
          />

          {/* Live formatted preview */}
          {skillLines.length > 0 && (
            <div className="rounded-md border border-bg-border bg-bg-surface/50 px-4 py-3 text-sm leading-relaxed">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Preview
              </p>
              {skillLines.map((line, i) => {
                const { category, items } = parseSkillLine(line);
                return (
                  <p key={i} className="flex gap-1">
                    <span className="shrink-0">•</span>
                    <span>
                      {category && <strong className="text-text-primary">{category}: </strong>}
                      <span className="text-text-secondary">{items}</span>
                    </span>
                  </p>
                );
              })}
            </div>
          )}
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
