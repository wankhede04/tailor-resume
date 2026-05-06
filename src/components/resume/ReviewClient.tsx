'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EditableProject, EditableResume, LockedResume } from '@/lib/resume/schema';
import { computeDiff, type FieldDiff, type ResumeDiff } from '@/lib/resume/diff';

interface Props {
  applicationId: string;
  profile: { slug: string; locked: LockedResume };
  original: EditableResume;
  tailored: EditableResume;
  status: 'draft' | 'finalized';
  pdfFilename: string | null;
}

type FieldValues = Map<string, string>;

const expBulletsKey = (id: string) => `experience[${id}].bullets`;
const projBulletsKey = (id: string) => `projects[${id}].bullets`;
const SKILLS_KEY = 'skills';

function splitLines(combined: string): string[] {
  return combined.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Parse "Category: item1, item2" → { category, items } for display
function parseSkillLine(line: string): { category: string | null; items: string } {
  const idx = line.indexOf(':');
  if (idx === -1) return { category: null, items: line.trim() };
  return { category: line.slice(0, idx).trim(), items: line.slice(idx + 1).trim() };
}

function initValues(diff: ResumeDiff): FieldValues {
  const map = new Map<string, string>();
  const set = (f: FieldDiff) => map.set(f.path, f.after ?? '');
  set(diff.summary);
  map.set(SKILLS_KEY, diff.skills.map((f) => f.after ?? '').filter(Boolean).join('\n'));
  diff.experience.forEach((e) => {
    const combined = e.bullets.map((f) => f.after ?? '').filter(Boolean).join('\n');
    map.set(expBulletsKey(e.id), combined);
  });
  diff.projects.forEach((p) => {
    set(p.name);
    set(p.description);
    const combined = p.bullets.map((f) => f.after ?? '').filter(Boolean).join('\n');
    map.set(projBulletsKey(p.id), combined);
  });
  return map;
}

function buildEditable(
  diff: ResumeDiff,
  values: FieldValues,
  original: EditableResume,
  tailored: EditableResume,
): EditableResume {
  const get = (f: FieldDiff): string => values.get(f.path) ?? f.after ?? '';
  const beforeProjects = new Map(original.projects.map((p) => [p.id, p]));
  const afterProjects = new Map(tailored.projects.map((p) => [p.id, p]));
  return {
    summary: get(diff.summary),
    skills: splitLines(values.get(SKILLS_KEY) ?? ''),
    experience: diff.experience.map((e) => ({
      id: e.id,
      bullets: splitLines(values.get(expBulletsKey(e.id)) ?? ''),
    })),
    projects: diff.projects.map((p): EditableProject => ({
      id: p.id,
      name: get(p.name),
      description: get(p.description),
      bullets: splitLines(values.get(projBulletsKey(p.id)) ?? ''),
      techStack: afterProjects.get(p.id)?.techStack ?? beforeProjects.get(p.id)?.techStack ?? [],
    })),
  };
}

function countChanges(diff: ResumeDiff): number {
  let n = 0;
  const tally = (f: FieldDiff) => { if (f.kind !== 'unchanged') n++; };
  tally(diff.summary);
  diff.skills.forEach(tally);
  diff.experience.forEach((e) => e.bullets.forEach(tally));
  diff.projects.forEach((p) => { tally(p.name); tally(p.description); p.bullets.forEach(tally); });
  return n;
}

// Word-style tracked changes hint shown below each field
function TrackedInline({ field }: { field: FieldDiff }) {
  if (field.kind === 'unchanged') return null;
  if (field.kind === 'removed') {
    return <span className="rounded bg-red-500/20 px-0.5 text-red-300 line-through">{field.before}</span>;
  }
  if (field.kind === 'added') {
    return (
      <span className="rounded bg-emerald-500/20 px-0.5 text-emerald-300 underline decoration-emerald-500/60">
        {field.after}
      </span>
    );
  }
  return (
    <>
      {field.inline.map((seg, i) => {
        if (seg.kind === 'add')
          return (
            <span key={i} className="rounded bg-emerald-500/20 px-0.5 text-emerald-300 underline decoration-emerald-500/60">
              {seg.text}
            </span>
          );
        if (seg.kind === 'remove')
          return (
            <span key={i} className="rounded bg-red-500/20 px-0.5 text-red-300 line-through">
              {seg.text}
            </span>
          );
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}

// Textarea that auto-grows to fit its content
function AutoTextarea({
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
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
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      style={{ overflow: 'hidden' }}
      className={className}
    />
  );
}

const fieldClass =
  'w-full resize-none rounded bg-transparent px-1.5 py-1 text-sm leading-relaxed text-text-primary ' +
  'border border-transparent placeholder:text-text-muted/40 ' +
  'hover:border-bg-border focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20 ' +
  'disabled:cursor-default transition-colors';

interface FieldProps {
  field: FieldDiff;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

// Always-editable multi-line field with tracked-changes hint below
function EditableBlock({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div className="w-full">
      <AutoTextarea
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={field.kind === 'removed' ? (field.before ?? '') : undefined}
        className={fieldClass}
      />
      {field.kind !== 'unchanged' && (
        <div className="mt-1 pl-1.5 text-[11px] leading-snug text-text-muted/70">
          <TrackedInline field={field} />
        </div>
      )}
    </div>
  );
}

// Always-editable single-line field (skills, project name)
function EditableInline({ field, value, onChange, disabled }: FieldProps) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={field.kind === 'removed' ? (field.before ?? '') : undefined}
        className={fieldClass}
        style={{ minWidth: `${Math.max(value.length, field.before?.length ?? 0, 6)}ch` }}
      />
      {field.kind !== 'unchanged' && (
        <div className="mt-0.5 pl-1.5 text-[11px] leading-snug text-text-muted/70">
          <TrackedInline field={field} />
        </div>
      )}
    </div>
  );
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
  const diff = useMemo(() => computeDiff(original, tailored), [original, tailored]);
  const [values, setValues] = useState<FieldValues>(() => initValues(diff));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFilename, setSavedFilename] = useState<string | null>(pdfFilename);
  const [finalized, setFinalized] = useState(status === 'finalized');
  const [previewing, setPreviewing] = useState(false);

  const factsById = useMemo(
    () => new Map(profile.locked.experienceFacts.map((f) => [f.id, f])),
    [profile.locked.experienceFacts],
  );

  const liveEditable = useMemo(
    () => buildEditable(diff, values, original, tailored),
    [diff, values, original, tailored],
  );

  const changedCount = useMemo(() => countChanges(diff), [diff]);

  function setValue(path: string, text: string) {
    setValues((prev) => new Map(prev).set(path, text));
  }

  function acceptAll() {
    setValues((prev) => {
      const next = new Map(prev);
      const accept = (f: FieldDiff) => next.set(f.path, f.after ?? '');
      accept(diff.summary);
      next.set(SKILLS_KEY, diff.skills.map((f) => f.after ?? '').filter(Boolean).join('\n'));
      diff.experience.forEach((e) => {
        next.set(expBulletsKey(e.id), e.bullets.map((f) => f.after ?? '').filter(Boolean).join('\n'));
      });
      diff.projects.forEach((p) => {
        accept(p.name); accept(p.description);
        next.set(projBulletsKey(p.id), p.bullets.map((f) => f.after ?? '').filter(Boolean).join('\n'));
      });
      return next;
    });
  }

  function rejectAll() {
    setValues((prev) => {
      const next = new Map(prev);
      const reject = (f: FieldDiff) => next.set(f.path, f.before ?? '');
      reject(diff.summary);
      next.set(SKILLS_KEY, diff.skills.map((f) => f.before ?? '').filter(Boolean).join('\n'));
      diff.experience.forEach((e) => {
        next.set(expBulletsKey(e.id), e.bullets.map((f) => f.before ?? '').filter(Boolean).join('\n'));
      });
      diff.projects.forEach((p) => {
        reject(p.name); reject(p.description);
        next.set(projBulletsKey(p.id), p.bullets.map((f) => f.before ?? '').filter(Boolean).join('\n'));
      });
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
      if (!res.ok) throw new Error(data?.error?.message ?? 'Save failed');
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

  async function onFinalizeAndDownload() {
    const ok = await persist(true);
    if (ok) {
      window.open(`/api/v1/resume/applications/${applicationId}/pdf`, '_blank');
      router.refresh();
    }
  }

  async function onPreview() {
    // Save current state so the PDF endpoint reflects the latest edits
    await persist(false);
    setPreviewing(true);
  }

  const blockProps = (f: FieldDiff): FieldProps => ({
    field: f,
    value: values.get(f.path) ?? '',
    onChange: (v) => setValue(f.path, v),
    disabled: finalized,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-6 border-b border-bg-border bg-bg-base/90 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span>
              <span className="font-semibold text-amber-300">{changedCount}</span>
              <span className="text-text-muted"> AI changes</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="rounded bg-emerald-500/20 px-1 text-[10px] text-emerald-300 underline">
                inserted
              </span>
              <span className="rounded bg-red-500/20 px-1 text-[10px] text-red-300 line-through">
                deleted
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={acceptAll} className="btn btn-ghost text-xs" disabled={finalized}>
              Accept all
            </button>
            <button type="button" onClick={rejectAll} className="btn btn-ghost text-xs" disabled={finalized}>
              Reject all
            </button>
            <button
              type="button"
              onClick={() => persist(false)}
              className="btn btn-secondary"
              disabled={saving || finalized}
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={onPreview}
              className="btn btn-secondary"
              disabled={saving}
            >
              Preview PDF
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
        {error && (
          <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            {error}
          </div>
        )}
        {savedFilename && (
          <div className="mt-2 text-xs text-text-muted">
            Saved as <code className="text-text-secondary">{savedFilename}</code>
          </div>
        )}
      </div>

      {/* Document */}
      <div className="rounded-lg border border-bg-border bg-bg-raised shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8 px-10 py-12">

          {/* Summary */}
          <section>
            <DocHeading>Professional Summary</DocHeading>
            <EditableBlock {...blockProps(diff.summary)} />
          </section>

          {/* Skills */}
          <section>
            <DocHeading>Skills Summary</DocHeading>
            <div className="space-y-3">
              {/* Combined textarea — one category row per line */}
              <div>
                <AutoTextarea
                  value={values.get(SKILLS_KEY) ?? ''}
                  onChange={(v) => setValue(SKILLS_KEY, v)}
                  disabled={finalized}
                  placeholder={'Expertise: NodeJS, TypeScript\nDatabases: PostgreSQL, Redis'}
                  className={fieldClass}
                />
                {diff.skills.some((f) => f.kind !== 'unchanged') && (
                  <div className="mt-1.5 space-y-0.5 pl-1.5 text-[11px] leading-snug text-text-muted/70">
                    {diff.skills.filter((f) => f.kind !== 'unchanged').map((f, i) => (
                      <div key={i}><TrackedInline field={f} /></div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live preview of the categorized format */}
              {(values.get(SKILLS_KEY) ?? '').trim() && (
                <div className="rounded-md border border-bg-border bg-bg-surface/50 px-3 py-2.5 text-sm leading-relaxed">
                  {splitLines(values.get(SKILLS_KEY) ?? '').map((line, i) => {
                    const { category, items } = parseSkillLine(line);
                    return (
                      <p key={i}>
                        {category && <strong className="text-text-primary">{category}: </strong>}
                        <span className="text-text-secondary">{items}</span>
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Experience */}
          <section>
            <DocHeading>Experience</DocHeading>
            <div className="space-y-7">
              {diff.experience.map((e) => {
                const facts = factsById.get(e.id);
                const key = expBulletsKey(e.id);
                const combined = values.get(key) ?? '';
                const changedBullets = e.bullets.filter((f) => f.kind !== 'unchanged');
                return (
                  <div key={e.id}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <div>
                        <span className="font-semibold text-text-primary">
                          {facts?.title ?? '(unknown role)'}
                        </span>
                        <span className="text-text-secondary"> · {facts?.company ?? ''}</span>
                        {facts?.location && (
                          <span className="ml-1 text-xs text-text-muted">· {facts.location}</span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-text-muted">
                        {facts?.startDate} – {facts?.endDate ?? 'Present'}
                      </span>
                    </div>
                    <div>
                      <AutoTextarea
                        value={combined}
                        onChange={(v) => setValue(key, v)}
                        disabled={finalized}
                        placeholder="One bullet per line…"
                        className={fieldClass}
                      />
                      {changedBullets.length > 0 && (
                        <div className="mt-1.5 space-y-0.5 pl-1.5 text-[11px] leading-snug text-text-muted/70">
                          {changedBullets.map((f, i) => (
                            <div key={i}><TrackedInline field={f} /></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Projects */}
          {diff.projects.length > 0 && (
            <section>
              <DocHeading>Projects</DocHeading>
              <div className="space-y-7">
                {diff.projects.map((p) => {
                  const key = projBulletsKey(p.id);
                  const combined = values.get(key) ?? '';
                  const changedBullets = p.bullets.filter((f) => f.kind !== 'unchanged');
                  return (
                    <div key={p.id}>
                      <div className="mb-1 font-semibold text-text-primary">
                        <EditableInline {...blockProps(p.name)} />
                      </div>
                      <div className="mb-2 text-text-secondary">
                        <EditableBlock {...blockProps(p.description)} />
                      </div>
                      <div>
                        <AutoTextarea
                          value={combined}
                          onChange={(v) => setValue(key, v)}
                          disabled={finalized}
                          placeholder="One bullet per line…"
                          className={fieldClass}
                        />
                        {changedBullets.length > 0 && (
                          <div className="mt-1.5 space-y-0.5 pl-1.5 text-[11px] leading-snug text-text-muted/70">
                            {changedBullets.map((f, i) => (
                              <div key={i}><TrackedInline field={f} /></div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* PDF preview overlay */}
      {previewing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-base">
          <div className="flex shrink-0 items-center justify-between border-b border-bg-border bg-bg-raised px-6 py-3">
            <span className="text-sm font-medium text-text-primary">PDF Preview</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">
                Changes were saved before this preview
              </span>
              <button
                type="button"
                onClick={() => setPreviewing(false)}
                className="btn btn-secondary text-xs"
              >
                ✕ Close preview
              </button>
            </div>
          </div>
          <iframe
            src={`/api/v1/resume/applications/${applicationId}/pdf?inline=true`}
            className="min-h-0 flex-1 w-full"
            title="Resume PDF preview"
          />
        </div>
      )}
    </div>
  );
}

function DocHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-bg-border pb-1 text-[11px] font-bold uppercase tracking-widest text-text-muted">
      {children}
    </h2>
  );
}
