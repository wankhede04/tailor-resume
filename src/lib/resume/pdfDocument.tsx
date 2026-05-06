/* eslint-disable react/no-unknown-property */
import * as React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { EditableResume, LockedResume } from './schema';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK = '#111827';       // primary text
const ACCENT = '#1e3a5f';    // name, section headings, rules
const MUTED = '#4b5563';     // secondary text, dates, company
const LIGHT = '#6b7280';     // contact row, bullet dots

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Page
  page: {
    paddingHorizontal: 44,
    paddingTop: 38,
    paddingBottom: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: INK,
  },

  // ── Header ──
  header: { marginBottom: 10 },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: ACCENT,
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  contactRow: {
    fontSize: 8.5,
    color: LIGHT,
    letterSpacing: 0.2,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    marginTop: 8,
  },

  // ── Section headings ──
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: ACCENT,
    borderBottomWidth: 0.75,
    borderBottomColor: ACCENT,
    paddingBottom: 2,
    marginTop: 13,
    marginBottom: 5,
  },

  // ── Summary ──
  paragraph: { lineHeight: 1.5, color: INK },

  // ── Skills ──
  skillRow: { flexDirection: 'row', marginBottom: 1.5 },
  skillBullet: { width: 10, color: LIGHT },
  skillLine: { flex: 1, lineHeight: 1.4 },

  // ── Experience ──
  expEntry: { marginBottom: 9 },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  expLeft: { flex: 1 },
  expTitle: { fontSize: 10.5, fontWeight: 700, color: INK },
  expCompanyText: { fontSize: 9.5, color: MUTED },
  expMeta: { fontSize: 8.5, color: MUTED, textAlign: 'right' },

  // ── Bullets ──
  bulletRow: { flexDirection: 'row', marginTop: 2 },
  bulletDot: { width: 10, color: LIGHT, fontSize: 9 },
  bulletText: { flex: 1, lineHeight: 1.45, color: INK },

  // ── Projects ──
  projectEntry: { marginBottom: 7 },
  projectNameRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 1 },
  projectName: { fontSize: 10.5, fontWeight: 700, color: INK },
  projectTech: { fontSize: 8.5, color: MUTED, marginLeft: 5 },
  projectDesc: { fontSize: 9, color: MUTED, marginBottom: 2, lineHeight: 1.4 },

  // ── Education ──
  eduEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  eduLeft: { flex: 1 },
  eduDegree: { fontWeight: 700, color: INK },
  eduInstitution: { fontSize: 9, color: MUTED },
  eduRight: { fontSize: 8.5, color: MUTED, textAlign: 'right' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function joinContact(c: LockedResume['contact']): string {
  return [c.email, c.phone, c.location, c.linkedin, c.github, c.website]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s)
    .join('   •   ');
}

/** Parse "Category: item1, item2" → { category, items } */
function parseSkillLine(line: string): { category: string | null; items: string } {
  const idx = line.indexOf(':');
  if (idx === -1) return { category: null, items: line.trim() };
  return { category: line.slice(0, idx).trim(), items: line.slice(idx + 1).trim() };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ResumePdfProps {
  locked: LockedResume;
  editable: EditableResume;
}

export function ResumePdf({ locked, editable }: ResumePdfProps) {
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));

  return (
    <Document title={`${locked.name} — Resume`}>
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.name}>{locked.name}</Text>
          <Text style={s.contactRow}>{joinContact(locked.contact)}</Text>
          <View style={s.headerRule} />
        </View>

        {/* ── Summary ── */}
        {editable.summary ? (
          <>
            <SectionTitle>Summary</SectionTitle>
            <Text style={s.paragraph}>{editable.summary}</Text>
          </>
        ) : null}

        {/* ── Skills Summary ── */}
        {editable.skills.length > 0 ? (
          <>
            <SectionTitle>Skills Summary</SectionTitle>
            {editable.skills.map((skill, i) => {
              const { category, items } = parseSkillLine(skill);
              return (
                <View key={i} style={s.skillRow}>
                  <Text style={s.skillBullet}>•</Text>
                  <Text style={s.skillLine}>
                    {category ? (
                      <Text style={{ fontWeight: 700 }}>{category}: </Text>
                    ) : null}
                    <Text style={{ color: MUTED }}>{items}</Text>
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}

        {/* ── Experience ── */}
        {editable.experience.length > 0 ? (
          <>
            <SectionTitle>Experience</SectionTitle>
            {editable.experience.map((exp) => {
              const f = factsById.get(exp.id);
              if (!f) return null;
              const dateRange = `${f.startDate} – ${f.endDate ?? 'Present'}`;
              const metaLine = f.location ? `${dateRange}   •   ${f.location}` : dateRange;
              return (
                <View key={exp.id} style={s.expEntry} wrap={false}>
                  <View style={s.expHeaderRow}>
                    <View style={s.expLeft}>
                      <Text style={s.expTitle}>
                        {f.title}
                        {'  '}
                        <Text style={s.expCompanyText}>{f.company}</Text>
                      </Text>
                    </View>
                    <Text style={s.expMeta}>{metaLine}</Text>
                  </View>
                  {exp.bullets.map((b, i) => (
                    <Bullet key={i}>{b}</Bullet>
                  ))}
                </View>
              );
            })}
          </>
        ) : null}

        {/* ── Projects ── */}
        {editable.projects.length > 0 ? (
          <>
            <SectionTitle>Projects</SectionTitle>
            {editable.projects.map((p) => (
              <View key={p.id} style={s.projectEntry} wrap={false}>
                <View style={s.projectNameRow}>
                  <Text style={s.projectName}>{p.name}</Text>
                  {p.techStack && p.techStack.length > 0 ? (
                    <Text style={s.projectTech}>{p.techStack.join(', ')}</Text>
                  ) : null}
                </View>
                {p.description ? (
                  <Text style={s.projectDesc}>{p.description}</Text>
                ) : null}
                {p.bullets.map((b, i) => (
                  <Bullet key={i}>{b}</Bullet>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {/* ── Education ── */}
        {locked.education.length > 0 ? (
          <>
            <SectionTitle>Education</SectionTitle>
            {locked.education.map((e, i) => (
              <View key={i} style={s.eduEntry}>
                <View style={s.eduLeft}>
                  <Text style={s.eduDegree}>
                    {e.degree}
                    {e.field ? `, ${e.field}` : ''}
                  </Text>
                  <Text style={s.eduInstitution}>{e.institution}</Text>
                </View>
                <Text style={s.eduRight}>
                  {e.startYear ? `${e.startYear} – ` : ''}
                  {e.endYear}
                  {e.gpa ? `\nGPA ${e.gpa}` : ''}
                </Text>
              </View>
            ))}
          </>
        ) : null}

      </Page>
    </Document>
  );
}
