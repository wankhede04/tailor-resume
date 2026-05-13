'use client';

import type { LatexTemplateId } from '@/lib/resume/latex-templates';

// ─── Sample data ──────────────────────────────────────────────────────────────

const NAME = 'Alexandra Chen';
const CONTACT = 'alex@example.com  |  (555) 123-4567  |  San Francisco, CA  |  GitHub  |  LinkedIn';
const SUMMARY =
  'Senior software engineer with 8 years building scalable distributed systems. Deep expertise in Go, TypeScript, and Kubernetes. Led migration of monolith to microservices serving 50M+ users.';
const SKILLS = [
  { label: 'Languages', value: 'Go, TypeScript, Python, SQL' },
  { label: 'Infrastructure', value: 'Kubernetes, Docker, Terraform, GCP' },
  { label: 'Databases', value: 'PostgreSQL, Redis, Cassandra' },
];
const EXPERIENCE = [
  {
    company: 'Stripe',
    title: 'Staff Software Engineer',
    date: 'Jan 2021 – Present',
    location: 'San Francisco, CA',
    bullets: [
      'Redesigned payment routing engine, reducing latency by 40% and handling 200K TPS',
      'Led a team of 6 engineers to deliver PCI-DSS compliant vault service on schedule',
    ],
  },
  {
    company: 'Datadog',
    title: 'Senior Software Engineer',
    date: 'Mar 2018 – Dec 2020',
    location: 'New York, NY',
    bullets: [
      'Built real-time log ingestion pipeline processing 1TB/day with sub-second indexing',
      'Reduced infrastructure costs by $2M/yr through data compression and tiered storage',
    ],
  },
];
const EDUCATION = { degree: 'B.S. Computer Science', school: 'UC Berkeley', year: '2017' };

// ─── Shared sub-pieces ────────────────────────────────────────────────────────

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
      <span style={{ flexShrink: 0 }}>•</span>
      <span>{text}</span>
    </div>
  );
}

// ─── Template renderers ───────────────────────────────────────────────────────

function Classic() {
  const sec: React.CSSProperties = {
    fontWeight: 700, fontSize: 10, letterSpacing: 0.5, marginTop: 10, marginBottom: 1,
    textTransform: 'uppercase',
  };
  const rule: React.CSSProperties = { borderBottom: '0.5px solid #c8cdd5', marginBottom: 4 };
  return (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 9, color: '#1a1a1a', padding: '18px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', letterSpacing: 1 }}>{NAME.toUpperCase()}</div>
        <div style={{ fontSize: 7.5, color: '#6b7280', marginTop: 3 }}>{CONTACT}</div>
      </div>
      <div style={{ borderBottom: '1px solid #c8cdd5', marginBottom: 4 }} />
      <div style={sec}>Professional Summary</div>
      <div style={rule} />
      <p style={{ lineHeight: 1.5, marginBottom: 6 }}>{SUMMARY}</p>
      <div style={sec}>Technical Skills</div>
      <div style={rule} />
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 1 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={sec}>Professional Experience</div>
      <div style={rule} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 7 }}>
          <div><strong>{e.company}</strong> — <strong>{e.title}</strong> <span style={{ color: '#6b7280', fontStyle: 'italic' }}> {e.location} · {e.date}</span></div>
          <div style={{ marginTop: 2 }}>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
      <div style={sec}>Education</div>
      <div style={rule} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>{EDUCATION.school}</strong><div style={{ color: '#6b7280', fontSize: 8 }}>{EDUCATION.degree}</div></div>
        <div style={{ color: '#6b7280', fontSize: 8 }}>{EDUCATION.year}</div>
      </div>
    </div>
  );
}

function Modern() {
  const accent = '#2563eb';
  const sec: React.CSSProperties = {
    fontWeight: 700, fontSize: 10, color: accent, letterSpacing: 0.4,
    marginTop: 10, marginBottom: 1,
  };
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 9, color: '#1a1a1a', padding: '16px 18px' }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{NAME}</div>
        <div style={{ fontSize: 7.5, color: '#4b5563', marginTop: 2 }}>
          {CONTACT.split('  |  ').join(' • ')}
        </div>
      </div>
      <div style={{ borderBottom: `1.5px solid ${accent}`, marginBottom: 4 }} />
      <div style={{ borderTop: `3px solid ${accent}`, marginBottom: 1 }} />
      <div style={sec}>Professional Summary</div>
      <div style={{ borderBottom: `0.5px solid #e5e7eb`, marginBottom: 3 }} />
      <p style={{ lineHeight: 1.5, marginBottom: 6 }}>{SUMMARY}</p>
      <div style={{ borderTop: `3px solid ${accent}`, marginBottom: 1 }} />
      <div style={sec}>Technical Skills</div>
      <div style={{ borderBottom: `0.5px solid #e5e7eb`, marginBottom: 3 }} />
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 1 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={{ borderTop: `3px solid ${accent}`, marginBottom: 1 }} />
      <div style={sec}>Professional Experience</div>
      <div style={{ borderBottom: `0.5px solid #e5e7eb`, marginBottom: 3 }} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 7 }}>
          <div><strong>{e.company}</strong> • <em>{e.title}</em> <span style={{ color: '#9ca3af', float: 'right' }}>{e.date}</span></div>
          <div style={{ marginTop: 2 }}>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
      <div style={{ borderTop: `3px solid ${accent}`, marginBottom: 1 }} />
      <div style={sec}>Education</div>
      <div style={{ borderBottom: `0.5px solid #e5e7eb`, marginBottom: 3 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>{EDUCATION.school}</strong> — {EDUCATION.degree}</div>
        <div style={{ color: '#9ca3af' }}>{EDUCATION.year}</div>
      </div>
    </div>
  );
}

function Professional() {
  const sec: React.CSSProperties = {
    fontWeight: 700, fontSize: 9.5, letterSpacing: 0.8, marginTop: 10, marginBottom: 2,
    textTransform: 'uppercase',
  };
  const rule: React.CSSProperties = { borderBottom: '0.5px solid #9ca3af', marginBottom: 4 };
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, color: '#1a1a1a', padding: '16px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{NAME}</div>
        <div style={{ fontSize: 7.5, color: '#4b5563', marginTop: 2 }}>{CONTACT}</div>
      </div>
      <div style={sec}>Summary</div>
      <div style={rule} />
      <p style={{ lineHeight: 1.5, marginBottom: 6 }}>{SUMMARY}</p>
      <div style={sec}>Technical Skills</div>
      <div style={rule} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px', marginBottom: 6 }}>
        {SKILLS.map((s) => (
          <div key={s.label} style={{ marginBottom: 1 }}>• <strong>{s.label}:</strong> {s.value}</div>
        ))}
      </div>
      <div style={sec}>Experience</div>
      <div style={rule} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{e.company}</strong>
            <em style={{ color: '#6b7280' }}>{e.date}</em>
          </div>
          <div style={{ color: '#4b5563' }}><em>{e.title}</em> — {e.location}</div>
          <div style={{ marginTop: 2 }}>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
      <div style={sec}>Education</div>
      <div style={rule} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>{EDUCATION.school}</strong><div style={{ color: '#6b7280', fontSize: 8 }}>{EDUCATION.degree}</div></div>
        <div style={{ color: '#6b7280' }}>{EDUCATION.year}</div>
      </div>
    </div>
  );
}

function Compact() {
  const sec: React.CSSProperties = {
    fontWeight: 700, fontSize: 8.5, marginTop: 6, marginBottom: 1,
  };
  const rule: React.CSSProperties = { borderBottom: '0.4px solid #9ca3af', marginBottom: 3 };
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, color: '#1a1a1a', padding: '12px 14px' }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{NAME}</div>
        <div style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>{CONTACT}</div>
      </div>
      <div style={{ borderBottom: '1px solid #d1d5db', marginBottom: 3 }} />
      <div style={sec}>Professional Summary</div>
      <div style={rule} />
      <p style={{ lineHeight: 1.4, marginBottom: 4 }}>{SUMMARY}</p>
      <div style={sec}>Technical Skills</div>
      <div style={rule} />
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 0.5 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={sec}>Professional Experience</div>
      <div style={rule} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 5 }}>
          <div><strong>{e.company}</strong> — <em>{e.title}</em> <span style={{ color: '#9ca3af', float: 'right' }}>{e.date}</span></div>
          <div>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
      <div style={sec}>Education</div>
      <div style={rule} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>{EDUCATION.school}</strong> — {EDUCATION.degree}</div>
        <div style={{ color: '#6b7280' }}>{EDUCATION.year}</div>
      </div>
    </div>
  );
}

function Executive() {
  const sec: React.CSSProperties = {
    fontWeight: 700, fontSize: 11, marginTop: 2, marginBottom: 2,
  };
  return (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 9, color: '#1a1a1a', padding: '18px 22px' }}>
      <div style={{ borderTop: '2px solid #111', paddingTop: 6, textAlign: 'center', marginBottom: 2 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>{NAME}</div>
        <div style={{ fontSize: 7.5, color: '#4b5563', marginTop: 4 }}>{CONTACT.split('  |  ').join('   ')}</div>
      </div>
      <div style={{ borderTop: '2px solid #111', borderBottom: '0.5px solid #9ca3af', marginBottom: 8, paddingBottom: 2 }} />
      <div style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', padding: '2px 0', marginBottom: 4 }}>
        <div style={sec}>Professional Summary</div>
      </div>
      <p style={{ lineHeight: 1.6, marginBottom: 8 }}>{SUMMARY}</p>
      <div style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', padding: '2px 0', marginBottom: 4 }}>
        <div style={sec}>Technical Skills</div>
      </div>
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 2 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', padding: '2px 0', margin: '8px 0 4px' }}>
        <div style={sec}>Professional Experience</div>
      </div>
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 8 }}>
          <div><strong>{e.company}</strong> <span style={{ float: 'right', color: '#6b7280' }}>{e.date}</span></div>
          <div><em>{e.title}</em> — {e.location}</div>
          <div style={{ marginTop: 2 }}>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
    </div>
  );
}

function Tech() {
  const sec: React.CSSProperties = {
    fontFamily: 'monospace', fontWeight: 700, fontSize: 8.5, marginTop: 9, marginBottom: 1,
    color: '#374151',
  };
  const rule: React.CSSProperties = { borderBottom: '0.5px solid #9ca3af', marginBottom: 3 };
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, color: '#1a1a1a', padding: '16px 18px' }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{NAME}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 7.5, color: '#374151', marginTop: 2 }}>
          {CONTACT.split('  |  ').join(' | ')}
        </div>
      </div>
      <div style={{ borderBottom: '0.8px solid #374151', marginBottom: 4 }} />
      <div style={sec}>-- Professional Summary --</div>
      <div style={rule} />
      <p style={{ lineHeight: 1.5, marginBottom: 5 }}>{SUMMARY}</p>
      <div style={sec}>-- Technical Skills --</div>
      <div style={rule} />
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 1 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={sec}>-- Professional Experience --</div>
      <div style={rule} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 7 }}>
          <div><strong>{e.company}</strong> <span style={{ float: 'right', fontFamily: 'monospace', color: '#6b7280', fontSize: 8 }}>{e.date}</span></div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#4b5563' }}>{e.title} | {e.location}</div>
          <div style={{ marginTop: 2 }}>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
      <div style={sec}>-- Education --</div>
      <div style={rule} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>{EDUCATION.school}</strong> — {EDUCATION.degree}</div>
        <div style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: 8 }}>{EDUCATION.year}</div>
      </div>
    </div>
  );
}

function Academic() {
  const sec: React.CSSProperties = {
    fontWeight: 700, fontSize: 11, marginTop: 10, marginBottom: 2,
  };
  const rule: React.CSSProperties = { borderBottom: '0.5px solid #9ca3af', marginBottom: 5 };
  return (
    <div style={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: 9, color: '#1a1a1a', padding: '18px 22px' }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{NAME}</div>
        <div style={{ fontSize: 7.5, color: '#4b5563', marginTop: 3 }}>{CONTACT}</div>
      </div>
      <div style={{ borderBottom: '1px solid #374151', marginBottom: 6 }} />
      {/* Education first */}
      <div style={sec}>Education</div>
      <div style={rule} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div><strong>{EDUCATION.school}</strong><div style={{ color: '#6b7280', fontSize: 8 }}>{EDUCATION.degree}</div></div>
        <div style={{ color: '#6b7280' }}>{EDUCATION.year}</div>
      </div>
      <div style={sec}>Professional Summary</div>
      <div style={rule} />
      <p style={{ lineHeight: 1.6, marginBottom: 8 }}>{SUMMARY}</p>
      <div style={sec}>Technical Skills</div>
      <div style={rule} />
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 2 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={sec}>Professional Experience</div>
      <div style={rule} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 8 }}>
          <div><strong>{e.company}</strong> <span style={{ float: 'right', color: '#6b7280' }}>{e.date}</span></div>
          <div style={{ fontStyle: 'italic', color: '#4b5563' }}>{e.title} — {e.location}</div>
          <div style={{ marginTop: 3 }}>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
    </div>
  );
}

function Minimalist() {
  const sec: React.CSSProperties = {
    fontWeight: 700, fontSize: 8.5, letterSpacing: 1.5, marginTop: 14, marginBottom: 5,
    textTransform: 'uppercase', color: '#374151',
  };
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, color: '#1a1a1a', padding: '22px 26px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 20, color: '#111', fontWeight: 300, letterSpacing: 0.5 }}>{NAME}</div>
        <div style={{ fontSize: 7.5, color: '#6b7280', marginTop: 4 }}>
          {CONTACT.split('  |  ').join('    ')}
        </div>
      </div>
      <div style={sec}>Summary</div>
      <p style={{ lineHeight: 1.6, marginBottom: 8 }}>{SUMMARY}</p>
      <div style={sec}>Skills</div>
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 3 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={sec}>Experience</div>
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>{e.company}</strong> · <em style={{ color: '#4b5563' }}>{e.title}</em></div>
            <div style={{ color: '#9ca3af', fontSize: 8 }}>{e.date}</div>
          </div>
          <div style={{ color: '#6b7280', fontSize: 8, marginBottom: 2 }}>{e.location}</div>
          <div>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
      <div style={sec}>Education</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>{EDUCATION.school}</strong> · {EDUCATION.degree}</div>
        <div style={{ color: '#9ca3af', fontSize: 8 }}>{EDUCATION.year}</div>
      </div>
    </div>
  );
}

function Corporate() {
  const sec: React.CSSProperties = {
    fontVariant: 'small-caps', fontWeight: 700, fontSize: 10, letterSpacing: 0.6,
    marginTop: 10, marginBottom: 1, textTransform: 'lowercase',
  };
  const rule: React.CSSProperties = { borderBottom: '0.6px solid #9ca3af', marginBottom: 4 };
  return (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 9, color: '#1a1a1a', padding: '18px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontVariant: 'small-caps', letterSpacing: 1.5, fontWeight: 700 }}>{NAME}</div>
        <div style={{ fontSize: 7.5, color: '#4b5563', marginTop: 3 }}>{CONTACT}</div>
      </div>
      <div style={{ borderBottom: '0.8px solid #374151', marginBottom: 2 }} />
      <div style={sec}>Professional Summary</div>
      <div style={rule} />
      <p style={{ lineHeight: 1.55, marginBottom: 6 }}>{SUMMARY}</p>
      <div style={sec}>Technical Skills</div>
      <div style={rule} />
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 1 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={sec}>Professional Experience</div>
      <div style={rule} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 7 }}>
          <div><strong>{e.company}</strong> <span style={{ float: 'right', color: '#6b7280' }}>{e.date}</span></div>
          <div style={{ fontStyle: 'italic', color: '#374151', marginBottom: 2 }}>{e.title} · {e.location}</div>
          <div>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
      <div style={sec}>Education</div>
      <div style={rule} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>{EDUCATION.school}</strong><div style={{ color: '#6b7280', fontSize: 8 }}>{EDUCATION.degree}</div></div>
        <div style={{ color: '#6b7280' }}>{EDUCATION.year}</div>
      </div>
    </div>
  );
}

function Bold() {
  const sec: React.CSSProperties = {
    fontWeight: 900, fontSize: 10.5, letterSpacing: 0.8, marginTop: 2,
    textTransform: 'uppercase',
  };
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, color: '#111', padding: '16px 18px' }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{NAME}</div>
        <div style={{ borderTop: '2.5px solid #111', borderBottom: '2.5px solid #111', margin: '4px 0', padding: '2px 0' }}>
          <div style={{ fontSize: 7.5, color: '#374151' }}>{CONTACT}</div>
        </div>
      </div>
      <div style={{ borderTop: '2.5px solid #111', marginBottom: 2 }} />
      <div style={sec}>Professional Summary</div>
      <div style={{ borderBottom: '2.5px solid #111', marginBottom: 4 }} />
      <p style={{ lineHeight: 1.5, marginBottom: 6 }}>{SUMMARY}</p>
      <div style={{ borderTop: '2.5px solid #111', marginBottom: 2 }} />
      <div style={sec}>Technical Skills</div>
      <div style={{ borderBottom: '2.5px solid #111', marginBottom: 4 }} />
      {SKILLS.map((s) => (
        <div key={s.label} style={{ marginBottom: 1.5 }}><strong>{s.label}:</strong> {s.value}</div>
      ))}
      <div style={{ borderTop: '2.5px solid #111', marginBottom: 2, marginTop: 8 }} />
      <div style={sec}>Professional Experience</div>
      <div style={{ borderBottom: '2.5px solid #111', marginBottom: 4 }} />
      {EXPERIENCE.map((e) => (
        <div key={e.company} style={{ marginBottom: 7 }}>
          {/* Title first in bold template */}
          <div><strong>{e.title}</strong> <span style={{ float: 'right', color: '#6b7280', fontWeight: 400 }}>{e.date}</span></div>
          <div style={{ color: '#374151', marginBottom: 2 }}><em>{e.company}</em> · {e.location}</div>
          <div>{e.bullets.map((b, i) => <Bullet key={i} text={b} />)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const RENDERERS: Record<LatexTemplateId, () => React.ReactElement> = {
  classic:      () => <Classic />,
  modern:       () => <Modern />,
  professional: () => <Professional />,
  compact:      () => <Compact />,
  executive:    () => <Executive />,
  tech:         () => <Tech />,
  academic:     () => <Academic />,
  minimalist:   () => <Minimalist />,
  corporate:    () => <Corporate />,
  bold:         () => <Bold />,
};

export function TemplatePreview({ templateId }: { templateId: LatexTemplateId }) {
  const Renderer = RENDERERS[templateId];
  return <Renderer />;
}
