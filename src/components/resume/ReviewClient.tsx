'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  EditableProject,
  EditableResume,
  LockedResume,
} from '@/lib/resume/schema';
import { computeDiff, summarizeDiff, type FieldDiff, type ResumeDiff } from '@/lib/resume/diff';

type LineMode = 'tailored' | 'original' | 'override';

interface LineState {
  mode: LineMode;
  override: string;
}

interface Props {
  applicationId: string;
  profile: { slug: string; locked: LockedResume };
  original: EditableResume;
  tailored: EditableResume; // initial AI output (or whatever is persisted)
  status: 'draft' | 'finalized';
  pdfFilename: string | null;
}

function defaultModeFor(field: FieldDiff): LineMode {
  // 'unchanged' lines render the same in both, so 'tailored' is fine.
  return field.kind === 'unchanged' ? 'tailored' : 'tailored';
}

function initialState(diff: ResumeDiff): Map<string, LineState> {
  const map = new Map<string, LineState>();
  const set = (f: FieldDiff) => {
    map.set(f.path, { mode: defaultModeFor(f), override: f.after ?? '' });
  };
  set(diff.summary);
  diff.skills.forEach(set);
  diff.experience.forEach((e) => e.bullets.forEach(set));
  diff.projects.forEach((p) => {
    set(p.name);
    set(p.description);
    p.bullets.forEach(set);
  });
  return map;
}

function valueFor(field: FieldDiff, state: LineState): string | null {
  switch (state.mode) {
    case 'tailored':
      return field.after;
    case 'original':
      return field.before;
    case 'override':
      return state.override;
  }
}

function renderInline(field: FieldDiff): React.ReactNode {
  if (field.kind === 'unchanged') {
    return <span>{field.after ?? field.before}</span>;
  }
  if (field.kind === 'removed') {
    return <span className="text-red-300 line-through">{field.before}</span>;
  }
  if (field.kind === 'added') {
    return <span className="text-emerald-300">{field.after}</span>;
  }
  return (
    <span>
      {field.inline.map((seg, i) => {
        if (seg.kind === 'add') {
          return (
            <span key={i} className="rounded-sm bg-emerald-500/20 px-0.5 text-emerald-200">
              {seg.text}
            </span>
          );
        }
        if (seg.kind === 'remove') {
          return (
            <span key={i} className="rounded-sm bg-red-500/20 px-0.5 text-red-200 line-through">
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}

function badgeFor(kind: FieldDiff['kind']): React.ReactNode {
  if (kind === 'unchanged') {
    return <span className="rounded-sm bg-bg-surface px-1 text-[10px] text-text-muted">=</span>;
  }
  if (kind === 'added') {
    return <span className="rounded-sm bg-emerald-500/20 px-1 text-[10px] text-emerald-200">+</span>;
  }
  if (kind === 'removed') {
    return <span className="rounded-sm bg-red-500/20 px-1 text-[10px] text-red-200">−</span>;
  }
  return <span className="rounded-sm bg-amber-500/20 px-1 text-[10px] text-amber-200">~</span>;
}

interface LineRowProps {
  field: FieldDiff;
  state: LineState;
  onChangeMode: (mode: LineMode) => void;
  onChangeOverride: (text: string) => void;
}

function LineRow({ field, state, onChangeMode, onChangeOverride }: LineRowProps) {
  const isChanged = field.kind !== 'unchanged';
  return (
    <div className="rounded-md border border-bg-border bg-bg-surface px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="pt-0.5">{badgeFor(field.kind)}</div>
        <div className="flex-1 text-sm leading-relaxed">
          {state.mode === 'override' ? (
            <textarea
              className="input min-h-[60px]"
              value={state.override}
              onChange={(e) => onChangeOverride(e.target.value)}
            />
          ) : state.mode === 'original' ? (
            <span className="text-text-secondary">
              {field.before ?? <em className="text-text-muted">(removed)</em>}
            </span>
          ) : (
            renderInline(field)
          )}
        </div>
        {isChanged ? (
          <div className="flex shrink-0 gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => onChangeMode('tailored')}
              className={`rounded px-1.5 py-0.5 ${
                state.mode === 'tailored'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-bg-raised text-text-muted hover:text-text-primary'
              }`}
              title="Use the AI-tailored line"
            >
              keep AI
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('original')}
              className={`rounded px-1.5 py-0.5 ${
                state.mode === 'original'
                  ? 'bg-red-500/20 text-red-200'
                  : 'bg-bg-raised text-text-muted hover:text-text-primary'
              }`}
              title="Revert to the original line"
            >
              revert
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeMode('override');
                if (!state.override) {
                  onChangeOverride(field.after ?? field.before ?? '');
                }
              }}
              className={`rounded px-1.5 py-0.5 ${
                state.mode === 'override'
                  ? 'bg-accent/20 text-accent'
                  : 'bg-bg-raised text-text-muted hover:text-text-primary'
              }`}
              title="Override with custom text"
            >
              edit
            </button>
          </div>
        ) : null}
      </div>
      {state.mode !== 'override' && isChanged ? (
        <div className="mt-1 pl-6 text-[11px] text-text-muted">
          <span className="text-red-300/70">−</span>{' '}
          <span className="line-through">{field.before ?? '(none)'}</span>
        </div>
      ) : null}
    </div>
  );
}

function projectMap(projects: EditableProject[]): Map<string, EditableProject> {
  return new Map(projects.map((p) => [p.id, p]));
}

function buildEditable(
  diff: ResumeDiff,
  state: Map<string, LineState>,
  original: EditableResume,
  tailored: EditableResume,
): EditableResume {
  const get = (f: FieldDiff): string => {
    const s = state.get(f.path);
    if (!s) return f.after ?? f.before ?? '';
    const v = valueFor(f, s);
    return v ?? '';
  };

  const summary = get(diff.summary);
  const skills = diff.skills.map(get).filter((s) => s.trim().length > 0);

  const experience = diff.experience.map((e) => ({
    id: e.id,
    bullets: e.bullets.map(get).filter((b) => b.trim().length > 0),
  }));

  const beforeProjects = projectMap(original.projects);
  const afterProjects = projectMap(tailored.projects);
  const projects: EditableProject[] = diff.projects.map((p) => {
    const beforeProj = beforeProjects.get(p.id);
    const afterProj = afterProjects.get(p.id);
    return {
      id: p.id,
      name: get(p.name),
      description: get(p.description),
      bullets: p.bullets.map(get).filter((b) => b.trim().length > 0),
      techStack: afterProj?.techStack ?? beforeProj?.techStack ?? [],
    };
  });

  return { summary, skills, experience, projects };
}

export function ReviewClient({
  applicationId,
  profile,
  original,
  tailored,
  status,
  pdfFilename,
}: Props) {
  const router = useRouter();
  const initialDiff = useMemo(() => computeDiff(original, tailored), [original, tailored]);
  const [state, setState] = useState<Map<string, LineState>>(() => initialState(initialDiff));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFilename, setSavedFilename] = useState<string | null>(pdfFilename);
  const [finalized, setFinalized] = useState(status === 'finalized');

  const factsById = useMemo(
    () => new Map(profile.locked.experienceFacts.map((f) => [f.id, f])),
    [profile.locked.experienceFacts],
  );

  // Compute the live editable from current state (acceptance choices applied).
  const liveEditable = useMemo(
    () => buildEditable(initialDiff, state, original, tailored),
    [initialDiff, state, original, tailored],
  );

  const liveDiff = useMemo(() => computeDiff(original, liveEditable), [original, liveEditable]);
  const summary = summarizeDiff(liveDiff);

  function setMode(path: string, mode: LineMode) {
    setState((prev) => {
      const next = new Map(prev);
      const cur = next.get(path) ?? { mode: 'tailored', override: '' };
      next.set(path, { ...cur, mode });
      return next;
    });
  }

  function setOverride(path: string, text: string) {
    setState((prev) => {
      const next = new Map(prev);
      const cur = next.get(path) ?? { mode: 'override', override: '' };
      next.set(path, { ...cur, override: text, mode: 'override' });
      return next;
    });
  }

  function bulkMode(mode: LineMode) {
    setState((prev) => {
      const next = new Map(prev);
      for (const [path, s] of next) {
        next.set(path, { ...s, mode });
      }
      return next;
    });
  }

  async function persist(finalize: boolean): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/resume/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailored: liveEditable, finalize }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Save failed');
      }
      if (finalize) {
        setFinalized(true);
        setSavedFilename(data.application.pdfFilename ?? null);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onSaveDraft() {
    await persist(false);
  }

  async function onFinalizeAndDownload() {
    const ok = await persist(true);
    if (ok) {
      // Force a fresh PDF render with the latest state.
      window.open(`/api/v1/resume/applications/${applicationId}/pdf`, '_blank');
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 -mx-6 border-b border-bg-border bg-bg-base/90 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">{summary.changed}</span>
            <span className="text-text-muted"> of {summary.total} lines changed </span>
            <span className="ml-2 rounded-sm bg-emerald-500/20 px-1 text-[10px] text-emerald-200">
              + add
            </span>
            <span className="ml-1 rounded-sm bg-red-500/20 px-1 text-[10px] text-red-200">
              − remove
            </span>
            <span className="ml-1 rounded-sm bg-amber-500/20 px-1 text-[10px] text-amber-200">
              ~ rewrite
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => bulkMode('tailored')}
              className="btn btn-ghost text-xs"
              disabled={finalized}
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => bulkMode('original')}
              className="btn btn-ghost text-xs"
              disabled={finalized}
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
              className="btn btn-secondary"
              disabled={saving || finalized}
            >
              {saving ? 'Saving...' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={onFinalizeAndDownload}
              className="btn btn-primary"
              disabled={saving}
            >
              {finalized ? 'Re-download PDF' : 'Finalize & download PDF'}
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            {error}
          </div>
        ) : null}
        {savedFilename ? (
          <div className="mt-2 text-xs text-text-muted">
            Saved as <code className="text-text-secondary">{savedFilename}</code>
          </div>
        ) : null}
      </div>

      {/* Sections */}
      <Section title="Summary">
        <LineRow
          field={liveDiff.summary}
          state={state.get('summary')!}
          onChangeMode={(m) => setMode('summary', m)}
          onChangeOverride={(t) => setOverride('summary', t)}
        />
      </Section>

      <Section title="Skills">
        <div className="space-y-1.5">
          {liveDiff.skills.map((f) => (
            <LineRow
              key={f.path}
              field={f}
              state={state.get(f.path)!}
              onChangeMode={(m) => setMode(f.path, m)}
              onChangeOverride={(t) => setOverride(f.path, t)}
            />
          ))}
        </div>
      </Section>

      <Section title="Experience">
        <div className="space-y-4">
          {liveDiff.experience.map((e) => {
            const f = factsById.get(e.id);
            return (
              <div key={e.id} className="rounded-md border border-bg-border bg-bg-raised p-3">
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <div>
                    <span className="font-semibold">{f?.title ?? '(unknown role)'}</span>{' '}
                    <span className="text-text-secondary">· {f?.company ?? ''}</span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {f?.startDate} – {f?.endDate}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {e.bullets.map((field) => (
                    <LineRow
                      key={field.path}
                      field={field}
                      state={state.get(field.path)!}
                      onChangeMode={(m) => setMode(field.path, m)}
                      onChangeOverride={(t) => setOverride(field.path, t)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {liveDiff.projects.length > 0 ? (
        <Section title="Projects">
          <div className="space-y-4">
            {liveDiff.projects.map((p) => (
              <div key={p.id} className="rounded-md border border-bg-border bg-bg-raised p-3">
                <div className="space-y-1.5">
                  <LineRow
                    field={p.name}
                    state={state.get(p.name.path)!}
                    onChangeMode={(m) => setMode(p.name.path, m)}
                    onChangeOverride={(t) => setOverride(p.name.path, t)}
                  />
                  <LineRow
                    field={p.description}
                    state={state.get(p.description.path)!}
                    onChangeMode={(m) => setMode(p.description.path, m)}
                    onChangeOverride={(t) => setOverride(p.description.path, t)}
                  />
                  {p.bullets.map((field) => (
                    <LineRow
                      key={field.path}
                      field={field}
                      state={state.get(field.path)!}
                      onChangeMode={(m) => setMode(field.path, m)}
                      onChangeOverride={(t) => setOverride(field.path, t)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
