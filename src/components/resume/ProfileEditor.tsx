'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SkillCategory } from '@/lib/resume/schema';

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

// ---- Inline types (mirrors schema.ts) ------------------------------------

type Contact = {
  email: string; phone: string; location: string;
  linkedin: string; github: string; website: string;
};
type EducationEntry = {
  institution: string; degree: string; field: string;
  startYear: string; endYear: string; gpa: string;
};
type ExperienceEntry = {
  id: string; title: string; company: string; location: string;
  startDate: string; endDate: string; bullets: string[];
};
type ProjectEntry = {
  id: string; name: string; description: string;
  bullets: string[]; techStack: string; url: string;
};
type FormState = {
  name: string;
  contact: Contact;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  summary: string;
  projects: ProjectEntry[];
};

// ---- Constants -----------------------------------------------------------

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

const CONTACT_FIELDS: [keyof Contact, string][] = [
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['location', 'Location'],
  ['linkedin', 'LinkedIn'],
  ['github', 'GitHub'],
  ['website', 'Website'],
];

const EDU_FIELDS: [keyof EducationEntry, string][] = [
  ['institution', 'Institution'],
  ['degree', 'Degree'],
  ['field', 'Field'],
  ['startYear', 'Start Year'],
  ['endYear', 'End Year'],
  ['gpa', 'GPA'],
];

const EXP_FIELDS: [keyof Omit<ExperienceEntry, 'id' | 'bullets'>, string][] = [
  ['title', 'Title'],
  ['company', 'Company'],
  ['location', 'Location'],
  ['startDate', 'Start Date'],
  ['endDate', 'End Date'],
];

// ---- Parse helpers -------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function parseContact(v: unknown): Contact {
  const c = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    email: str(c.email), phone: str(c.phone), location: str(c.location),
    linkedin: str(c.linkedin), github: str(c.github), website: str(c.website),
  };
}

function parseEdu(v: unknown): EducationEntry {
  const e = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    institution: str(e.institution), degree: str(e.degree), field: str(e.field),
    startYear: str(e.startYear), endYear: str(e.endYear), gpa: str(e.gpa),
  };
}

function parseExp(fact: unknown, bulletsMap: Record<string, string[]>): ExperienceEntry {
  const f = fact && typeof fact === 'object' ? (fact as Record<string, unknown>) : {};
  const id = str(f.id) || `exp-${uid()}`;
  return {
    id, title: str(f.title), company: str(f.company),
    location: str(f.location), startDate: str(f.startDate), endDate: str(f.endDate),
    bullets: bulletsMap[id] ?? [],
  };
}

function parseProj(v: unknown): ProjectEntry {
  const p = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    id: str(p.id) || `proj-${uid()}`,
    name: str(p.name), description: str(p.description),
    bullets: Array.isArray(p.bullets) ? (p.bullets as unknown[]).map(str) : [],
    techStack: Array.isArray(p.techStack)
      ? (p.techStack as unknown[]).map(str).join(', ')
      : str(p.techStack),
    url: str(p.url),
  };
}

function initForm(locked: unknown, editable: unknown): FormState {
  const l = locked && typeof locked === 'object' ? (locked as Record<string, unknown>) : {};
  const e = editable && typeof editable === 'object' ? (editable as Record<string, unknown>) : {};

  const bulletsMap: Record<string, string[]> = {};
  if (Array.isArray(e.experience)) {
    for (const x of e.experience) {
      if (x && typeof x === 'object') {
        const ex = x as Record<string, unknown>;
        const id = str(ex.id);
        if (id) bulletsMap[id] = Array.isArray(ex.bullets) ? (ex.bullets as unknown[]).map(str) : [];
      }
    }
  }

  return {
    name: str(l.name),
    contact: parseContact(l.contact),
    education: Array.isArray(l.education) ? l.education.map(parseEdu) : [],
    experience: Array.isArray(l.experienceFacts)
      ? l.experienceFacts.map((f) => parseExp(f, bulletsMap))
      : [],
    summary: str(e.summary),
    projects: Array.isArray(e.projects) ? e.projects.map(parseProj) : [],
  };
}

// ---- Skills helpers ------------------------------------------------------

function parseSkillsToMap(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const idx = t.indexOf(':');
    if (idx === -1) continue;
    map[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return map;
}

function splitSkillRows(rows: { cat: string; items: string }[]): SkillCategory[] {
  return rows
    .filter((r) => r.items.trim())
    .map((r) => ({
      category: r.cat,
      items: r.items.split(',').map((s) => s.trim()).filter(Boolean),
    }));
}

function initSkillRows(editable: unknown): { cat: string; items: string }[] {
  const text = extractSkillsText(editable);
  const map = parseSkillsToMap(text);
  const seen = new Set<string>();
  const rows: { cat: string; items: string }[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const idx = t.indexOf(':');
    if (idx === -1) continue;
    const cat = t.slice(0, idx).trim();
    if (cat && !seen.has(cat)) { rows.push({ cat, items: map[cat] ?? '' }); seen.add(cat); }
  }
  for (const cat of SKILL_CATEGORIES) {
    if (!seen.has(cat)) rows.push({ cat, items: '' });
  }
  return rows;
}

function extractSkillsText(editable: unknown): string {
  if (!editable || typeof editable !== 'object') return '';
  const skills = (editable as Record<string, unknown>).skills;
  if (!Array.isArray(skills)) return '';
  return (skills as unknown[])
    .flatMap((s) => {
      if (s && typeof s === 'object') {
        const sk = s as { category?: string; items?: unknown[] };
        if (sk.category && Array.isArray(sk.items)) {
          return [`${sk.category}: ${sk.items.map((i) => (typeof i === 'string' ? i : '')).filter(Boolean).join(', ')}`];
        }
      }
      return [];
    })
    .join('\n');
}

// ---- Shared UI helpers ---------------------------------------------------

function DragHandle() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="shrink-0">
      <circle cx="2.5" cy="2.5" r="1.5" />
      <circle cx="7.5" cy="2.5" r="1.5" />
      <circle cx="2.5" cy="7" r="1.5" />
      <circle cx="7.5" cy="7" r="1.5" />
      <circle cx="2.5" cy="11.5" r="1.5" />
      <circle cx="7.5" cy="11.5" r="1.5" />
    </svg>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function SectionHeader({ title, badge, onAdd }: { title: string; badge?: string; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="label">{title}</span>
        {badge && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-bg-border text-text-muted">
            {badge}
          </span>
        )}
      </div>
      {onAdd && (
        <button type="button" onClick={onAdd} className="btn btn-ghost text-xs">
          + Add
        </button>
      )}
    </div>
  );
}

// ---- Main component ------------------------------------------------------

export function ProfileEditor({ mode, profileId, initial }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial.slug);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [form, setForm] = useState<FormState>(() => initForm(initial.locked, initial.editable));
  const [skillRows, setSkillRows] = useState<{ cat: string; items: string }[]>(() => initSkillRows(initial.editable));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Form updaters ----

  function patch(update: Partial<FormState>) {
    setForm((f) => ({ ...f, ...update }));
  }

  function setContact(update: Partial<Contact>) {
    setForm((f) => ({ ...f, contact: { ...f.contact, ...update } }));
  }

  function updateEdu(i: number, update: Partial<EducationEntry>) {
    setForm((f) => {
      const education = [...f.education];
      education[i] = { ...education[i], ...update };
      return { ...f, education };
    });
  }

  function updateExp(i: number, update: Partial<ExperienceEntry>) {
    setForm((f) => {
      const experience = [...f.experience];
      experience[i] = { ...experience[i], ...update };
      return { ...f, experience };
    });
  }

  function updateProj(i: number, update: Partial<ProjectEntry>) {
    setForm((f) => {
      const projects = [...f.projects];
      projects[i] = { ...projects[i], ...update };
      return { ...f, projects };
    });
  }

  // ---- Submit / delete ----

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const locked = {
        name: form.name,
        contact: form.contact,
        education: form.education,
        experienceFacts: form.experience.map(({ id, title, company, location, startDate, endDate }) => ({
          id, title, company, location, startDate, endDate,
        })),
      };
      const editable = {
        summary: form.summary,
        skills: splitSkillRows(skillRows),
        experience: form.experience.map(({ id, bullets }) => ({
          id, bullets: bullets.map((b) => b.trim()).filter(Boolean),
        })),
        projects: form.projects.map(({ id, name, description, bullets, techStack, url }) => ({
          id, name, description,
          bullets: bullets.map((b) => b.trim()).filter(Boolean),
          techStack: techStack.split(',').map((s) => s.trim()).filter(Boolean),
          url,
        })),
      };

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

  // ---- Render ----

  return (
    <form onSubmit={onSubmit} className="space-y-8">

      {/* Slug + Display name */}
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

      {/* ── LOCKED ─────────────────────────────────────────────────────── */}

      {/* Identity */}
      <div className="space-y-3">
        <SectionHeader title="Identity" badge="locked" />
        <Row label="Name">
          <input
            className="input flex-1 text-sm"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Your Name"
          />
        </Row>
      </div>

      {/* Contact */}
      <div className="space-y-2">
        <SectionHeader title="Contact" badge="locked" />
        {CONTACT_FIELDS.map(([field, label]) => (
          <Row key={field} label={label}>
            <input
              className="input flex-1 font-mono text-xs"
              value={form.contact[field]}
              onChange={(e) => setContact({ [field]: e.target.value })}
              placeholder={field === 'email' ? 'you@example.com' : label}
            />
          </Row>
        ))}
      </div>

      {/* Education */}
      <div className="space-y-3">
        <SectionHeader
          title="Education"
          badge="locked"
          onAdd={() =>
            patch({
              education: [
                ...form.education,
                { institution: '', degree: '', field: '', startYear: '', endYear: '', gpa: '' },
              ],
            })
          }
        />
        <div className="space-y-3">
          {form.education.map((edu, i) => (
            <div key={i} className="rounded-md border border-bg-border p-4 space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => patch({ education: form.education.filter((_, j) => j !== i) })}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
              {EDU_FIELDS.map(([field, label]) => (
                <Row key={field} label={label}>
                  <input
                    className="input flex-1 text-xs"
                    value={edu[field]}
                    onChange={(e) => updateEdu(i, { [field]: e.target.value })}
                    placeholder={label}
                  />
                </Row>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── EXPERIENCE (locked facts + editable bullets together) ────────── */}

      <div className="space-y-3">
        <SectionHeader
          title="Experience"
          onAdd={() =>
            patch({
              experience: [
                ...form.experience,
                { id: `exp-${uid()}`, title: '', company: '', location: '', startDate: '', endDate: '', bullets: [] },
              ],
            })
          }
        />
        <p className="text-xs text-text-muted">Facts are locked · Bullets are editable by AI</p>
        <div className="space-y-4">
          {form.experience.map((exp, i) => (
            <div key={exp.id} className="rounded-md border border-bg-border p-4 space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => patch({ experience: form.experience.filter((_, j) => j !== i) })}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
              {EXP_FIELDS.map(([field, label]) => (
                <Row key={field} label={label}>
                  <input
                    className="input flex-1 text-xs"
                    value={exp[field]}
                    onChange={(e) => updateExp(i, { [field]: e.target.value })}
                    placeholder={label}
                  />
                </Row>
              ))}
              <div className="flex items-start gap-3 pt-1">
                <span className="w-32 shrink-0 pt-1 text-xs font-medium text-text-secondary">Bullets</span>
                <textarea
                  className="input flex-1 font-mono text-xs min-h-[90px] leading-relaxed"
                  value={exp.bullets.join('\n')}
                  onChange={(e) => updateExp(i, { bullets: e.target.value.split('\n') })}
                  placeholder="One bullet per line"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── EDITABLE ───────────────────────────────────────────────────── */}

      {/* Summary */}
      <div className="space-y-2">
        <SectionHeader title="Summary" badge="editable" />
        <textarea
          className="input w-full min-h-[80px] text-sm leading-relaxed"
          value={form.summary}
          onChange={(e) => patch({ summary: e.target.value })}
          placeholder="Professional summary…"
        />
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <SectionHeader title="Skills" badge="editable" />
        <p className="text-xs text-text-muted">
          Fill in items for each category · format: <code className="text-text-secondary">item1, item2, item3</code>
        </p>
        <div className="space-y-2">
          {skillRows.map((row, i) => (
            <div
              key={row.cat}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== i) {
                  setSkillRows((rows) => {
                    const next = [...rows];
                    const [item] = next.splice(dragIndex, 1);
                    next.splice(i, 0, item);
                    return next;
                  });
                }
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-3 transition-opacity${dragIndex === i ? ' opacity-40' : ''}`}
            >
              <span className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary">
                <DragHandle />
              </span>
              <span className="w-52 shrink-0 text-xs font-medium text-text-secondary">{row.cat}</span>
              <input
                className="input flex-1 font-mono text-xs"
                value={row.items}
                onChange={(e) => {
                  const val = e.target.value;
                  setSkillRows((rows) => rows.map((r, j) => j === i ? { ...r, items: val } : r));
                }}
                placeholder="item1, item2, item3"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="space-y-3">
        <SectionHeader
          title="Projects"
          badge="editable"
          onAdd={() =>
            patch({
              projects: [
                ...form.projects,
                { id: `proj-${uid()}`, name: '', description: '', bullets: [], techStack: '', url: '' },
              ],
            })
          }
        />
        <div className="space-y-4">
          {form.projects.map((proj, i) => (
            <div key={proj.id} className="rounded-md border border-bg-border p-4 space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => patch({ projects: form.projects.filter((_, j) => j !== i) })}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
              {(
                [
                  ['name', 'Name'],
                  ['description', 'Description'],
                  ['techStack', 'Tech Stack'],
                  ['url', 'GitHub / Website'],
                ] as [keyof ProjectEntry, string][]
              ).map(([field, label]) => (
                <Row key={field} label={label}>
                  <input
                    className="input flex-1 text-xs"
                    value={proj[field] as string}
                    onChange={(e) => updateProj(i, { [field]: e.target.value })}
                    placeholder={
                      field === 'techStack' ? 'React, TypeScript, …' :
                      field === 'url' ? 'https://github.com/user/repo' :
                      label
                    }
                  />
                </Row>
              ))}
              <div className="flex items-start gap-3 pt-1">
                <span className="w-32 shrink-0 pt-1 text-xs font-medium text-text-secondary">Bullets</span>
                <textarea
                  className="input flex-1 font-mono text-xs min-h-[80px] leading-relaxed"
                  value={proj.bullets.join('\n')}
                  onChange={(e) => updateProj(i, { bullets: e.target.value.split('\n') })}
                  placeholder="One bullet per line"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : mode === 'create' ? 'Create profile' : 'Save changes'}
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
