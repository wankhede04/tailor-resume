/* eslint-disable react/no-unknown-property */
// Template B — Classic: Formal corporate, no colour accents
// TODO: implement distinct design based on reference PDF templates/B.pdf
import * as React from 'react';
import { Document, Page, StyleSheet, Text, View, Link } from '@react-pdf/renderer';
import type { LockedResume } from '../schema';
import type { ResumePdfProps } from '../pdfDocument';

const BLACK  = '#000000';
const INK    = '#1a1a1a';
const MUTED  = '#4a4a4a';
const RULE   = '#aaaaaa';

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 50,
    paddingTop: 44,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: INK,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: BLACK,
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: 9,
    marginBottom: 8,
  },
  contactText: { color: MUTED },
  contactLink: { color: INK },
  contactSep:  { color: MUTED, paddingHorizontal: 5 },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: BLACK,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: BLACK,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sectionRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    marginBottom: 5,
  },
  paragraph: { lineHeight: 1.55, color: INK },
  skillLine: { lineHeight: 1.55, marginBottom: 0.5 },
  expEntry: { marginBottom: 10 },
  expHeaderLine: { fontSize: 10.5, marginBottom: 3 },
  bulletRow: { flexDirection: 'row', marginBottom: 2.5 },
  bulletDot:  { width: 13, color: INK, fontSize: 10 },
  bulletText: { flex: 1, lineHeight: 1.45 },
  projectEntry:   { marginBottom: 8 },
  projectHeader:  { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 2 },
  projectName:    { fontSize: 10.5, fontWeight: 700, color: INK },
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

function normalizeProjectUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://${url}`;
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

export function TemplateB({ locked, editable }: ResumePdfProps) {
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));
  const contactItems = buildContactItems(locked.contact);

  return (
    <Document title={`${locked.name} — Resume`}>
      <Page size="LETTER" style={s.page}>

        <Text style={s.name}>{locked.name.toUpperCase()}</Text>

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

        <View style={s.headerRule} />

        {editable.summary ? (
          <>
            <SectionTitle>Professional Summary</SectionTitle>
            <Text style={s.paragraph}>{editable.summary}</Text>
          </>
        ) : null}

        {editable.skills.length > 0 ? (
          <>
            <SectionTitle>Skills</SectionTitle>
            {editable.skills.map((skill, i) => (
              <Text key={i} style={s.skillLine}>
                <Text style={{ fontWeight: 700 }}>{skill.category}: </Text>
                <Text>{skill.items.join(', ')}</Text>
              </Text>
            ))}
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
                    <Text style={{ fontWeight: 700 }}>{f.company}</Text>
                    <Text style={{ color: MUTED }}>{'   —   '}</Text>
                    <Text style={{ fontWeight: 700 }}>{f.title}</Text>
                    {meta ? <Text style={{ color: MUTED }}>{'   '}{meta}</Text> : null}
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
                  {p.url ? (
                    <Link src={normalizeProjectUrl(p.url)} style={[s.projectName, s.contactLink]}>{p.name}</Link>
                  ) : (
                    <Text style={s.projectName}>{p.name}</Text>
                  )}
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
