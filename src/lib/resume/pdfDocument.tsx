/* eslint-disable react/no-unknown-property */
import * as React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { EditableResume, LockedResume } from './schema';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { marginBottom: 12 },
  name: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  contactRow: { fontSize: 9, color: '#444' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#888',
    paddingBottom: 2,
  },
  paragraph: { lineHeight: 1.4 },
  expHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  expRole: { fontWeight: 700 },
  expCompany: { color: '#444' },
  bulletRow: { flexDirection: 'row', marginTop: 2 },
  bulletDot: { width: 8, fontSize: 10 },
  bulletText: { flex: 1, lineHeight: 1.4 },
  skillsRow: { lineHeight: 1.4 },
  projectName: { fontWeight: 700, marginTop: 6 },
  projectDesc: { color: '#444', fontSize: 9 },
  educationRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  eduPrimary: { fontWeight: 700 },
});

export interface ResumePdfProps {
  locked: LockedResume;
  editable: EditableResume;
}

function joinContact(c: LockedResume['contact']): string {
  return [c.email, c.phone, c.location, c.linkedin, c.github, c.website]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s)
    .join('  •  ');
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function ResumePdf({ locked, editable }: ResumePdfProps) {
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));

  return (
    <Document title={`${locked.name} — Resume`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{locked.name}</Text>
          <Text style={styles.contactRow}>{joinContact(locked.contact)}</Text>
        </View>

        {editable.summary ? (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.paragraph}>{editable.summary}</Text>
          </>
        ) : null}

        {editable.skills.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skillsRow}>{editable.skills.join('  •  ')}</Text>
          </>
        ) : null}

        {editable.experience.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Experience</Text>
            {editable.experience.map((exp) => {
              const f = factsById.get(exp.id);
              if (!f) return null;
              return (
                <View key={exp.id} wrap={false}>
                  <View style={styles.expHeader}>
                    <Text style={styles.expRole}>
                      {f.title}
                      <Text style={styles.expCompany}>  ·  {f.company}</Text>
                    </Text>
                    <Text style={styles.expCompany}>
                      {f.startDate} – {f.endDate}
                      {f.location ? `   ${f.location}` : ''}
                    </Text>
                  </View>
                  {exp.bullets.map((b, i) => (
                    <Bullet key={i}>{b}</Bullet>
                  ))}
                </View>
              );
            })}
          </>
        ) : null}

        {editable.projects.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Projects</Text>
            {editable.projects.map((p) => (
              <View key={p.id} wrap={false}>
                <Text style={styles.projectName}>
                  {p.name}
                  {p.techStack && p.techStack.length > 0 ? (
                    <Text style={styles.projectDesc}>  —  {p.techStack.join(', ')}</Text>
                  ) : null}
                </Text>
                {p.description ? <Text style={styles.projectDesc}>{p.description}</Text> : null}
                {p.bullets.map((b, i) => (
                  <Bullet key={i}>{b}</Bullet>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {locked.education.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            {locked.education.map((e, i) => (
              <View key={i} style={styles.educationRow}>
                <Text style={styles.eduPrimary}>
                  {e.degree}
                  {e.field ? `, ${e.field}` : ''}  ·  {e.institution}
                </Text>
                <Text style={styles.expCompany}>
                  {e.startYear ? `${e.startYear} – ` : ''}
                  {e.endYear}
                  {e.gpa ? `   GPA ${e.gpa}` : ''}
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}
