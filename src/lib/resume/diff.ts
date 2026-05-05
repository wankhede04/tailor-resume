import { diffWords } from 'diff';
import type { EditableProject, EditableResume } from './schema';

// A semantic diff for the editable resume sections.
// Each section produces an array of "field diffs" the UI can render
// (Gitk-style red/green) and the user can accept/reject per line.

export type FieldChangeKind = 'unchanged' | 'modified' | 'added' | 'removed';

export interface InlineSegment {
  text: string;
  kind: 'context' | 'add' | 'remove';
}

// A single editable line (summary string, one bullet, one skill, etc.).
export interface FieldDiff {
  // Stable key identifying this line in the resume tree.
  // e.g. "summary", "skills[0]", "experience[exp-acme].bullets[0]", "projects[proj-x].name"
  path: string;
  label: string; // human-friendly label for UI grouping/display
  kind: FieldChangeKind;
  before: string | null;
  after: string | null;
  inline: InlineSegment[]; // word-level diff for rendering when modified
}

export interface ResumeDiff {
  summary: FieldDiff;
  skills: FieldDiff[]; // one per skill slot
  experience: { id: string; bullets: FieldDiff[] }[];
  projects: { id: string; name: FieldDiff; description: FieldDiff; bullets: FieldDiff[] }[];
}

function classify(before: string | null, after: string | null): FieldChangeKind {
  if (before === null && after !== null) return 'added';
  if (before !== null && after === null) return 'removed';
  if (before !== null && after !== null && before !== after) return 'modified';
  return 'unchanged';
}

function inlineDiff(before: string | null, after: string | null): InlineSegment[] {
  const a = before ?? '';
  const b = after ?? '';
  const parts = diffWords(a, b);
  return parts.map((p) => ({
    text: p.value,
    kind: p.added ? 'add' : p.removed ? 'remove' : 'context',
  }));
}

function textDiff(path: string, label: string, before: string | null, after: string | null): FieldDiff {
  return {
    path,
    label,
    kind: classify(before, after),
    before,
    after,
    inline: inlineDiff(before, after),
  };
}

function arrayDiff(
  pathPrefix: string,
  labelPrefix: string,
  before: string[],
  after: string[],
): FieldDiff[] {
  const max = Math.max(before.length, after.length);
  const out: FieldDiff[] = [];
  for (let i = 0; i < max; i++) {
    const b = i < before.length ? before[i] : null;
    const a = i < after.length ? after[i] : null;
    out.push(textDiff(`${pathPrefix}[${i}]`, `${labelPrefix} ${i + 1}`, b, a));
  }
  return out;
}

function projectByIdMap(projects: EditableProject[]): Map<string, EditableProject> {
  return new Map(projects.map((p) => [p.id, p]));
}

export function computeDiff(before: EditableResume, after: EditableResume): ResumeDiff {
  const summary = textDiff('summary', 'Professional summary', before.summary, after.summary);

  const skills = arrayDiff('skills', 'Skill', before.skills, after.skills);

  const experience = after.experience.map((expAfter) => {
    const expBefore = before.experience.find((e) => e.id === expAfter.id);
    const beforeBullets = expBefore?.bullets ?? [];
    return {
      id: expAfter.id,
      bullets: arrayDiff(`experience[${expAfter.id}].bullets`, 'Bullet', beforeBullets, expAfter.bullets),
    };
  });

  const beforeProjects = projectByIdMap(before.projects);
  const projects = after.projects.map((projAfter) => {
    const projBefore = beforeProjects.get(projAfter.id);
    const name = textDiff(
      `projects[${projAfter.id}].name`,
      'Project name',
      projBefore?.name ?? null,
      projAfter.name,
    );
    const description = textDiff(
      `projects[${projAfter.id}].description`,
      'Project description',
      projBefore?.description ?? null,
      projAfter.description,
    );
    const bullets = arrayDiff(
      `projects[${projAfter.id}].bullets`,
      'Bullet',
      projBefore?.bullets ?? [],
      projAfter.bullets,
    );
    return { id: projAfter.id, name, description, bullets };
  });

  return { summary, skills, experience, projects };
}

// Counts per change kind, useful for the review screen header.
export function summarizeDiff(diff: ResumeDiff): {
  changed: number;
  unchanged: number;
  total: number;
} {
  let changed = 0;
  let total = 0;
  const tally = (f: FieldDiff) => {
    total++;
    if (f.kind !== 'unchanged') changed++;
  };
  tally(diff.summary);
  diff.skills.forEach(tally);
  diff.experience.forEach((e) => e.bullets.forEach(tally));
  diff.projects.forEach((p) => {
    tally(p.name);
    tally(p.description);
    p.bullets.forEach(tally);
  });
  return { changed, unchanged: total - changed, total };
}
