/* eslint-disable react/no-unknown-property */
// Template D — Formal: Staff-level traditional with subtitle line
// TODO: implement distinct design based on reference PDF templates/D.pdf
import * as React from 'react';
import { Document, Page, StyleSheet, Text, View, Link } from '@react-pdf/renderer';
import type { LockedResume } from '../schema';
import type { ResumePdfProps } from '../pdfDocument';

const DARK   = '#111827';
const INK    = '#1f2937';
const MUTED  = '#6b7280';
const ACCENT = '#374151';
const RULE   = '#d1d5db';

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 52,
    paddingTop: 44,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: INK,
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    color: DARK,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: 9,
    marginBottom: 10,
  },
  contactText: { color: MUTED },
  contactLink: { color: ACCENT },
  contactSep:  { color: MUTED, paddingHorizontal: 5 },
  headerRule: {
    borderBottomWidth: 2,
    borderBottomColor: DARK,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: ACCENT,
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 4,
  },
  sectionRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    marginBottom: 6,
  },
  paragraph: { lineHeight: 1.6, color: INK },
  skillLine: { lineHeight: 1.55, marginBottom: 0.5 },
  expEntry: { marginBottom: 12 },
  expTitleLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  expTitle: { fontWeight: 700, fontSize: 10.5, color: DARK },
  expDates: { fontSize: 9, color: MUTED },
  expSubLine: { fontSize: 9, color: MUTED, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', marginBottom: 2.5 },
  bulletDot:  { width: 13, color: INK, fontSize: 10 },
  bulletText: { flex: 1, lineHeight: 1.45 },
  projectEntry:   { marginBottom: 8 },
  projectHeader:  { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 2 },
  projectName:    { fontSize: 10.5, fontWeight: 700, color: DARK },
  projectTech:    { fontSize: 8.5, color: MUTED, marginLeft: 6 },
  projectDesc:    { fontSize: 9, color: MUTED, lineHeight: 1.45, marginBottom: 2 },
  eduEntry: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  eduLeft:  { flex: 1 },
  eduDeg:   { fontWeight: 700, color: INK },
  eduInst:  { fontSize: 9, color: MUTED },
  eduRight: { fontSize: 9, color: MUTED, textAlign: 'right' },
});

interface ContactItem { label: string; href?: string; isText?: boolean; }

function buildContactItems(c: LockedResume['contact']): ContactItem[] {
  const items: ContactItem[] = [];
  if (c.email)    items.push({ label: c.email, href: `mailto:${c.email}` });
  if (c.phone)    items.push({ label: c.phone, isText: true });
  if (c.location) items.push({ label: c.location, isText: true });
  if (c.github) {
    const href = c.github.startsWith('http') ? c.github : `https://github.com/${c.github}`;
    items.push({ label: 'GitHub', href });
  }
  if (c.linkedin) {
    const href = c.linkedin.startsWith('http') ? c.linkedin : `https://linkedin.com/in/${c.linkedin}`;
    items.push({ label: 'LinkedIn', href });
  }
  if (c.website) items.push({ label: c.website, href: c.website });
  return items;
}

function parseSkillLine(line: string): { category: string | null; items: string } {
  const idx = line.indexOf(':');
  if (idx === -1) return { category: null, items: line.trim() };
  return { category: line.slice(0, idx).trim(), items: line.slice(idx + 1).trim() };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.sectionTitle}>{(children as string)?.toUpperCase?.() ?? children}</Text>
      <View style={s.sectionRule} />
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export function TemplateD({ locked, editable }: ResumePdfProps) {
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));
  const contactItems = buildContactItems(locked.contact);

  // Derive a subtitle from the most recent job title if available
  const latestTitle = locked.experienceFacts[0]?.title ?? '';

  return (
    <Document title={`${locked.name} — Resume`}>
      <Page size="LETTER" style={s.page}>

        <Text style={s.name}>{locked.name.toUpperCase()}</Text>
        {latestTitle ? <Text style={s.subtitle}>{latestTitle}</Text> : null}

        <View style={s.contactRow}>
          {contactItems.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Text style={s.contactSep}>·</Text>}
              {item.isText
                ? <Text style={s.contactText}>{item.label}</Text>
                : <Link src={item.href ?? '#'} style={s.contactLink}>{item.label}</Link>
              }
            </React.Fragment>
          ))}
        </View>

        <View style={s.headerRule} />

        {editable.summary ? (
          <>
            <SectionTitle>Profile</SectionTitle>
            <Text style={s.paragraph}>{editable.summary}</Text>
          </>
        ) : null}

        {editable.skills.length > 0 ? (
          <>
            <SectionTitle>Core Competencies</SectionTitle>
            {editable.skills.map((skill, i) => {
              const { category, items } = parseSkillLine(skill);
              return (
                <Text key={i} style={s.skillLine}>
                  {category ? <Text style={{ fontWeight: 700 }}>{category}: </Text> : null}
                  <Text>{items}</Text>
                </Text>
              );
            })}
          </>
        ) : null}

        {editable.experience.length > 0 ? (
          <>
            <SectionTitle>Professional Experience</SectionTitle>
            {editable.experience.map((exp) => {
              const f = factsById.get(exp.id);
              if (!f) return null;
              const dateRange = f.endDate ? `${f.startDate} – ${f.endDate}` : `${f.startDate} – Present`;
              return (
                <View key={exp.id} style={s.expEntry} wrap={false}>
                  <View style={s.expTitleLine}>
                    <Text style={s.expTitle}>{f.title}</Text>
                    <Text style={s.expDates}>{dateRange}</Text>
                  </View>
                  <Text style={s.expSubLine}>
                    {f.company}{f.location ? ` · ${f.location}` : ''}
                  </Text>
                  {exp.bullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
                </View>
              );
            })}
          </>
        ) : null}

        {editable.projects.length > 0 ? (
          <>
            <SectionTitle>Selected Projects</SectionTitle>
            {editable.projects.map((p) => (
              <View key={p.id} style={s.projectEntry} wrap={false}>
                <View style={s.projectHeader}>
                  <Text style={s.projectName}>{p.name}</Text>
                  {p.techStack && p.techStack.length > 0 ? (
                    <Text style={s.projectTech}>{p.techStack.join(', ')}</Text>
                  ) : null}
                </View>
                {p.description ? <Text style={s.projectDesc}>{p.description}</Text> : null}
                {p.bullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
              </View>
            ))}
          </>
        ) : null}

        {locked.education.length > 0 ? (
          <>
            <SectionTitle>Education</SectionTitle>
            {locked.education.map((e, i) => (
              <View key={i} style={s.eduEntry}>
                <View style={s.eduLeft}>
                  <Text style={s.eduDeg}>{e.degree}{e.field ? `, ${e.field}` : ''}</Text>
                  <Text style={s.eduInst}>{e.institution}</Text>
                </View>
                <Text style={s.eduRight}>
                  {e.startYear ? `${e.startYear} – ` : ''}{e.endYear}
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
