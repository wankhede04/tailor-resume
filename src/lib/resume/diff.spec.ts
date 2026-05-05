import { describe, expect, it } from 'vitest';
import { computeDiff, summarizeDiff } from './diff';
import type { EditableResume } from './schema';

const base: EditableResume = {
  summary: 'Backend engineer focused on payments.',
  skills: ['Go', 'Python', 'Postgres'],
  experience: [
    {
      id: 'exp-1',
      bullets: ['Owned ledger service.', 'Drove SLO program.'],
    },
  ],
  projects: [
    {
      id: 'p-1',
      name: 'OpenLedger',
      description: 'Double-entry library',
      bullets: ['1k stars'],
      techStack: [],
    },
  ],
};

describe('computeDiff', () => {
  it('marks unchanged content as unchanged', () => {
    const diff = computeDiff(base, base);
    const summary = summarizeDiff(diff);
    expect(summary.changed).toBe(0);
    expect(summary.total).toBeGreaterThan(0);
  });

  it('detects modified summary and bullets', () => {
    const after: EditableResume = {
      ...base,
      summary: 'Backend engineer focused on payments and reliability.',
      experience: [
        {
          id: 'exp-1',
          bullets: ['Owned ledger service handling $200M+ annually.', 'Drove SLO program.'],
        },
      ],
    };
    const diff = computeDiff(base, after);
    expect(diff.summary.kind).toBe('modified');
    expect(diff.experience[0].bullets[0].kind).toBe('modified');
    expect(diff.experience[0].bullets[1].kind).toBe('unchanged');
  });

  it('detects added and removed skills', () => {
    const after: EditableResume = { ...base, skills: ['Go', 'Postgres', 'Kafka'] };
    const diff = computeDiff(base, after);
    // index 0: Go -> Go (unchanged)
    // index 1: Python -> Postgres (modified)
    // index 2: Postgres -> Kafka (modified)
    expect(diff.skills[0].kind).toBe('unchanged');
    expect(diff.skills[1].kind).toBe('modified');
    expect(diff.skills[2].kind).toBe('modified');
  });

  it('handles bullet additions and removals', () => {
    const fewer: EditableResume = {
      ...base,
      experience: [{ id: 'exp-1', bullets: ['Owned ledger service.'] }],
    };
    const more: EditableResume = {
      ...base,
      experience: [
        {
          id: 'exp-1',
          bullets: ['Owned ledger service.', 'Drove SLO program.', 'Mentored two engineers.'],
        },
      ],
    };
    const diff = computeDiff(fewer, more);
    expect(diff.experience[0].bullets).toHaveLength(3);
    expect(diff.experience[0].bullets[0].kind).toBe('unchanged');
    expect(diff.experience[0].bullets[1].kind).toBe('added');
    expect(diff.experience[0].bullets[2].kind).toBe('added');
  });

  it('inline word diff highlights additions and removals', () => {
    const after: EditableResume = {
      ...base,
      summary: 'Backend engineer focused on reliability.',
    };
    const diff = computeDiff(base, after);
    const inline = diff.summary.inline;
    const hasAdd = inline.some((s) => s.kind === 'add');
    const hasRemove = inline.some((s) => s.kind === 'remove');
    expect(hasAdd).toBe(true);
    expect(hasRemove).toBe(true);
  });
});
