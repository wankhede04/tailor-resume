/* eslint-disable react/no-unknown-property */
// Template C — Modern: Blue accent throughout, grid skills
// TODO: implement distinct design based on reference PDF templates/C.pdf
import * as React from 'react';
import { Document, Page, StyleSheet, Text, View, Link } from '@react-pdf/renderer';
import type { LockedResume } from '../schema';
import type { ResumePdfProps } from '../pdfDocument';

const BLUE   = '#2563eb';
const INK    = '#1a1a1a';
const MUTED  = '#6b7280';
const BG_HEAD = '#eff6ff';

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 46,
    paddingTop: 0,
    paddingBottom: 38,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: INK,
  },
  header: {
    backgroundColor: BG_HEAD,
    paddingHorizontal: 46,
    paddingTop: 32,
    paddingBottom: 20,
    marginBottom: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: 700,
    color: BLUE,
    letterSpacing: 1,
    marginBottom: 5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: 9,
  },
  contactLink: { color: BLUE },
  contactText: { color: MUTED },
  contactSep:  { color: MUTED, paddingHorizontal: 5 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: BLUE,
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: BLUE,
    paddingBottom: 2,
  },
  paragraph: { lineHeight: 1.55, color: INK, marginTop: 4 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  skillChip: {
    fontSize: 8.5,
    color: BLUE,
    borderWidth: 0.5,
    borderColor: BLUE,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 5,
    marginBottom: 4,
  },
  skillLine: { lineHeight: 1.55, marginBottom: 0.5, marginTop: 4 },
  expEntry: { marginBottom: 10 },
  expHeaderLine: { fontSize: 10.5, marginBottom: 3 },
  bulletRow: { flexDirection: 'row', marginBottom: 2.5 },
  bulletDot:  { width: 13, color: BLUE, fontSize: 10 },
  bulletText: { flex: 1, lineHeight: 1.45 },
  projectEntry:   { marginBottom: 8 },
  projectHeader:  { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 2 },
  projectName:    { fontSize: 10.5, fontWeight: 700, color: BLUE },
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
  return <Text style={s.sectionTitle}>{(children as string)?.toUpperCase?.() ?? children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>▸</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export function TemplateC({ locked, editable }: ResumePdfProps) {
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));
  const contactItems = buildContactItems(locked.contact);

  return (
    <Document title={`${locked.name} — Resume`}>
      <Page size="LETTER" style={s.page}>

        <View style={s.header}>
          <Text style={s.name}>{locked.name}</Text>
          <View style={s.contactRow}>
            {contactItems.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={s.contactSep}>|</Text>}
                {item.isText
                  ? <Text style={s.contactText}>{item.label}</Text>
                  : <Link src={item.href ?? '#'} style={s.contactLink}>{item.label}</Link>
                }
              </React.Fragment>
            ))}
          </View>
        </View>

        {editable.summary ? (
          <>
            <SectionTitle>Summary</SectionTitle>
            <Text style={s.paragraph}>{editable.summary}</Text>
          </>
        ) : null}

        {editable.skills.length > 0 ? (
          <>
            <SectionTitle>Technical Skills</SectionTitle>
            {editable.skills.map((skill, i) => {
              const { category, items } = parseSkillLine(skill);
              return (
                <Text key={i} style={s.skillLine}>
                  {category ? <Text style={{ fontWeight: 700, color: BLUE }}>{category}: </Text> : null}
                  <Text>{items}</Text>
                </Text>
              );
            })}
          </>
        ) : null}

        {editable.experience.length > 0 ? (
          <>
            <SectionTitle>Experience</SectionTitle>
            {editable.experience.map((exp) => {
              const f = factsById.get(exp.id);
              if (!f) return null;
              const dateRange = f.endDate ? `${f.startDate} – ${f.endDate}` : `${f.startDate} – Present`;
              const meta = [f.location, dateRange].filter(Boolean).join(' · ');
              return (
                <View key={exp.id} style={s.expEntry} wrap={false}>
                  <Text style={s.expHeaderLine}>
                    <Text style={{ fontWeight: 700, color: BLUE }}>{f.company}</Text>
                    <Text style={{ color: MUTED }}>{'   —   '}</Text>
                    <Text style={{ fontWeight: 700 }}>{f.title}</Text>
                    {meta ? <Text style={{ fontStyle: 'italic', color: MUTED }}>{'   '}{meta}</Text> : null}
                  </Text>
                  {exp.bullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
                </View>
              );
            })}
          </>
        ) : null}

        {editable.projects.length > 0 ? (
          <>
            <SectionTitle>Projects</SectionTitle>
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
