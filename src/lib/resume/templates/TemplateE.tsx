/* eslint-disable react/no-unknown-property */
// Template E — Balanced: Modern professional, works across industries
// TODO: implement distinct design based on reference PDF templates/E.pdf
import * as React from 'react';
import { Document, Page, StyleSheet, Text, View, Link } from '@react-pdf/renderer';
import type { LockedResume } from '../schema';
import type { ResumePdfProps } from '../pdfDocument';

const TEAL   = '#0f766e';
const INK    = '#1a1a1a';
const MUTED  = '#6b7280';
const RULE   = '#e5e7eb';
const BG_BAR = '#f0fdf9';

const s = StyleSheet.create({
  page: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: INK,
  },
  topBar: {
    backgroundColor: TEAL,
    paddingHorizontal: 46,
    paddingTop: 32,
    paddingBottom: 22,
  },
  name: {
    fontSize: 26,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: 9,
  },
  contactLink: { color: '#d1fae5' },
  contactText: { color: '#d1fae5' },
  contactSep:  { color: '#6ee7b7', paddingHorizontal: 5 },
  body: {
    paddingHorizontal: 46,
    paddingTop: 10,
    paddingBottom: 38,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: TEAL,
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 2,
  },
  sectionRule: {
    borderBottomWidth: 1,
    borderBottomColor: TEAL,
    marginBottom: 6,
    opacity: 0.4,
  },
  paragraph: { lineHeight: 1.55, color: INK },
  skillLine: { lineHeight: 1.55, marginBottom: 0.5 },
  expEntry: { marginBottom: 10 },
  expHeaderLine: { fontSize: 10.5, marginBottom: 3 },
  bulletRow: { flexDirection: 'row', marginBottom: 2.5 },
  bulletDot:  { width: 13, color: TEAL, fontSize: 10 },
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

export function TemplateE({ locked, editable }: ResumePdfProps) {
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));
  const contactItems = buildContactItems(locked.contact);

  return (
    <Document title={`${locked.name} — Resume`}>
      <Page size="LETTER" style={s.page}>

        <View style={s.topBar}>
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

        <View style={s.body}>

          {editable.summary ? (
            <>
              <SectionTitle>Professional Summary</SectionTitle>
              <Text style={s.paragraph}>{editable.summary}</Text>
            </>
          ) : null}

          {editable.skills.length > 0 ? (
            <>
              <SectionTitle>Technical Skills</SectionTitle>
              {editable.skills.map((skill, i) => (
                <Text key={i} style={s.skillLine}>
                  <Text style={{ fontWeight: 700, color: TEAL }}>{skill.category}: </Text>
                  <Text>{skill.items.join(', ')}</Text>
                </Text>
              ))}
            </>
          ) : null}

          {editable.experience.length > 0 ? (
            <>
              <SectionTitle>Professional Experience</SectionTitle>
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

        </View>
      </Page>
    </Document>
  );
}
