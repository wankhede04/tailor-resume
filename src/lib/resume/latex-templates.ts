import type { EditableResume, LockedResume } from './schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LatexTemplateId =
  | 'classic'
  | 'modern'
  | 'professional'
  | 'compact'
  | 'executive'
  | 'tech'
  | 'academic'
  | 'minimalist'
  | 'corporate'
  | 'bold';

export interface LatexTemplateMeta {
  id: LatexTemplateId;
  label: string;
  description: string;
}

export const LATEX_TEMPLATE_LIST: LatexTemplateMeta[] = [
  { id: 'classic',      label: 'Classic',      description: 'Centered header, clean rules, timeless single-column' },
  { id: 'modern',       label: 'Modern',       description: 'Left-aligned header, accent rule under name' },
  { id: 'professional', label: 'Professional', description: 'Right-aligned dates, two-column skills block' },
  { id: 'compact',      label: 'Compact',      description: 'Dense layout, tight margins — fits more on one page' },
  { id: 'executive',    label: 'Executive',    description: 'Bold name, thick dividers, formal tone' },
  { id: 'tech',         label: 'Tech',         description: 'Monospace section labels, minimal colour' },
  { id: 'academic',     label: 'Academic',     description: 'Traditional serif-style structure, education first' },
  { id: 'minimalist',   label: 'Minimalist',   description: 'Maximum whitespace, no decorative elements' },
  { id: 'corporate',    label: 'Corporate',    description: 'Small-caps headings, centred contact block' },
  { id: 'bold',         label: 'Bold',         description: 'Heavy section headers, strong visual hierarchy' },
];

export const DEFAULT_LATEX_TEMPLATE_ID: LatexTemplateId = 'classic';

// ─── Shared escape helper ─────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// ─── Contact builder ──────────────────────────────────────────────────────────

function buildContactParts(c: LockedResume['contact']): string[] {
  const parts: string[] = [];
  if (c.email)    parts.push(`\\href{mailto:${c.email}}{${esc(c.email)}}`);
  if (c.phone)    parts.push(esc(c.phone));
  if (c.location) parts.push(esc(c.location));
  if (c.github) {
    const url = c.github.startsWith('http') ? c.github : `https://github.com/${c.github}`;
    parts.push(`\\href{${url}}{GitHub}`);
  }
  if (c.linkedin) {
    const url = c.linkedin.startsWith('http') ? c.linkedin : `https://linkedin.com/in/${c.linkedin}`;
    parts.push(`\\href{${url}}{LinkedIn}`);
  }
  if (c.website) parts.push(`\\href{${c.website}}{${esc(c.website)}}`);
  return parts;
}

// ─── Shared content blocks (reused across templates) ─────────────────────────

function summaryBlock(editable: EditableResume, cmd: string): string[] {
  if (!editable.summary) return [];
  return ['', `${cmd}{Professional Summary}`, esc(editable.summary)];
}

function skillsBlock(editable: EditableResume, cmd: string): string[] {
  if (!editable.skills.length) return [];
  const lines = ['', `${cmd}{Technical Skills}`];
  lines.push(String.raw`\begin{itemize}[leftmargin=0pt, label={}, itemsep=1pt, parsep=0pt]`);
  for (const skill of editable.skills) {
    lines.push(`  \\item \\textbf{${esc(skill.category)}:} ${esc(skill.items.join(', '))}`);
  }
  lines.push(String.raw`\end{itemize}`);
  return lines;
}

function experienceBlock(
  editable: EditableResume,
  locked: LockedResume,
  cmd: string,
  titleFirst = false,
): string[] {
  if (!editable.experience.length) return [];
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));
  const lines = ['', `${cmd}{Professional Experience}`];
  for (const exp of editable.experience) {
    const f = factsById.get(exp.id);
    if (!f) continue;
    const dateRange = f.endDate ? `${f.startDate} -- ${f.endDate}` : `${f.startDate} -- Present`;
    lines.push('');
    lines.push(String.raw`\noindent`);
    if (titleFirst) {
      lines.push(`\\textbf{${esc(f.title)}} \\hfill ${esc(dateRange)}\\\\`);
      lines.push(`\\textit{${esc(f.company)}}${f.location ? ` \\hfill ${esc(f.location)}` : ''}\\\\[-4pt]`);
    } else {
      lines.push(`\\textbf{${esc(f.company)}} \\hfill ${esc(dateRange)}\\\\`);
      lines.push(`\\textit{${esc(f.title)}}${f.location ? ` \\hfill ${esc(f.location)}` : ''}\\\\[-4pt]`);
    }
    if (exp.bullets.length > 0) {
      lines.push(String.raw`\begin{itemize}[leftmargin=12pt, itemsep=1pt, parsep=0pt, topsep=2pt]`);
      for (const b of exp.bullets) lines.push(`  \\item ${esc(b)}`);
      lines.push(String.raw`\end{itemize}`);
    }
  }
  return lines;
}

function projectsBlock(editable: EditableResume, cmd: string): string[] {
  if (!editable.projects.length) return [];
  const lines = ['', `${cmd}{Projects}`];
  for (const p of editable.projects) {
    lines.push('');
    lines.push(String.raw`\noindent`);
    const techStr =
      p.techStack && p.techStack.length > 0
        ? ` \\textit{\\small (${esc(p.techStack.join(', '))})}` : '';
    lines.push(`\\textbf{${esc(p.name)}}${techStr}\\\\[-4pt]`);
    if (p.description) lines.push(`${esc(p.description)}\\\\[-4pt]`);
    if (p.bullets.length > 0) {
      lines.push(String.raw`\begin{itemize}[leftmargin=12pt, itemsep=1pt, parsep=0pt, topsep=2pt]`);
      for (const b of p.bullets) lines.push(`  \\item ${esc(b)}`);
      lines.push(String.raw`\end{itemize}`);
    }
  }
  return lines;
}

function educationBlock(locked: LockedResume, cmd: string): string[] {
  if (!locked.education.length) return [];
  const lines = ['', `${cmd}{Education}`];
  for (const e of locked.education) {
    const years = e.startYear ? `${e.startYear} -- ${e.endYear ?? ''}` : (e.endYear ?? '');
    const degreeStr = e.field ? `${esc(e.degree)}, ${esc(e.field)}` : esc(e.degree);
    lines.push('');
    lines.push(String.raw`\noindent`);
    lines.push(`\\textbf{${esc(e.institution)}} \\hfill ${esc(years)}\\\\`);
    lines.push(`${degreeStr}${e.gpa ? ` \\hfill GPA: ${esc(String(e.gpa))}` : ''}\\\\`);
  }
  return lines;
}

// ─── Template 1: Classic ──────────────────────────────────────────────────────

function generateClassic(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const sectionCmd = String.raw`\ressection`;
  const preamble = [
    String.raw`\documentclass[letterpaper,11pt]{article}`,
    String.raw`\usepackage[left=0.75in,top=0.55in,right=0.75in,bottom=0.55in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{0pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{6pt}\textbf{\large #1}%`,
    String.raw`  \vspace{2pt}\hrule\vspace{4pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    String.raw`{\centering`,
    `  {\\Huge \\textbf{${esc(locked.name)}}}\\\\[4pt]`,
  ];
  if (contactParts.length > 0) preamble.push(`  ${contactParts.join(' $|$ ')}\\\\`);
  preamble.push('}');
  preamble.push(String.raw`\vspace{4pt}`);

  const body = [
    ...summaryBlock(editable, sectionCmd),
    ...skillsBlock(editable, sectionCmd),
    ...experienceBlock(editable, locked, sectionCmd),
    ...projectsBlock(editable, sectionCmd),
    ...educationBlock(locked, sectionCmd),
    '',
    String.raw`\end{document}`,
  ];

  return [...preamble, ...body].join('\n');
}

// ─── Template 2: Modern ───────────────────────────────────────────────────────

function generateModern(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,10.5pt]{article}`,
    String.raw`\usepackage[left=0.65in,top=0.5in,right=0.65in,bottom=0.5in]{geometry}`,
    String.raw`\usepackage[hidelinks,colorlinks=true,urlcolor=blue]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    String.raw`\usepackage{xcolor}`,
    String.raw`\definecolor{accent}{RGB}{37,99,235}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{0pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{8pt}{\color{accent}\rule{\linewidth}{1.2pt}}\\[-6pt]%`,
    String.raw`  {\bfseries\large\color{accent} #1}\vspace{3pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    `{\\LARGE \\textbf{${esc(locked.name)}}}\\\\[2pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`{\\small ${contactParts.join(' \\textbullet\\ ')}}\\\\`);
  }
  lines.push(String.raw`\vspace{2pt}{\color{accent}\rule{\linewidth}{0.6pt}}`);

  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);

  return lines.join('\n');
}

// ─── Template 3: Professional ─────────────────────────────────────────────────

function generateProfessional(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const factsById = new Map(locked.experienceFacts.map((f) => [f.id, f]));

  const lines: string[] = [
    String.raw`\documentclass[letterpaper,11pt]{article}`,
    String.raw`\usepackage[left=0.7in,top=0.5in,right=0.7in,bottom=0.5in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage{multicol}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{2pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{6pt}\noindent\textbf{\MakeUppercase{#1}}\vspace{1pt}\hrule\vspace{4pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    String.raw`\begin{center}`,
    `  {\\huge \\textbf{${esc(locked.name)}}}\\\\[3pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`  {\\small ${contactParts.join(' $\\cdot$ ')}}\\\\`);
  }
  lines.push(String.raw`\end{center}`);
  lines.push(String.raw`\vspace{2pt}`);

  if (editable.summary) {
    lines.push('', String.raw`\ressection{Summary}`);
    lines.push(esc(editable.summary));
  }

  // Two-column skills
  if (editable.skills.length > 0) {
    lines.push('', String.raw`\ressection{Technical Skills}`);
    lines.push(String.raw`\begin{multicols}{2}`);
    lines.push(String.raw`\begin{itemize}[leftmargin=12pt, itemsep=0pt, parsep=0pt]`);
    for (const skill of editable.skills) {
      lines.push(`  \\item \\textbf{${esc(skill.category)}:} ${esc(skill.items.join(', '))}`);
    }
    lines.push(String.raw`\end{itemize}`);
    lines.push(String.raw`\end{multicols}`);
  }

  if (editable.experience.length > 0) {
    lines.push('', String.raw`\ressection{Experience}`);
    for (const exp of editable.experience) {
      const f = factsById.get(exp.id);
      if (!f) continue;
      const dateRange = f.endDate ? `${f.startDate} -- ${f.endDate}` : `${f.startDate} -- Present`;
      lines.push('');
      lines.push(`\\textbf{${esc(f.company)}}\\hfill\\textit{${esc(dateRange)}}`);
      lines.push(`\\\\\\textit{${esc(f.title)}}${f.location ? `\\hfill ${esc(f.location)}` : ''}\\vspace{2pt}`);
      if (exp.bullets.length > 0) {
        lines.push(String.raw`\begin{itemize}[leftmargin=14pt, itemsep=1pt, parsep=0pt, topsep=1pt]`);
        for (const b of exp.bullets) lines.push(`  \\item ${esc(b)}`);
        lines.push(String.raw`\end{itemize}`);
      }
    }
  }

  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Template 4: Compact ─────────────────────────────────────────────────────

function generateCompact(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,10pt]{article}`,
    String.raw`\usepackage[left=0.5in,top=0.4in,right=0.5in,bottom=0.4in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{0pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{4pt}\textbf{#1}\vspace{1pt}\hrule height 0.4pt\vspace{3pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    String.raw`{\centering`,
    `  {\\large \\textbf{${esc(locked.name)}}}\\\\[2pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`  {\\footnotesize ${contactParts.join(' $|$ ')}}\\\\`);
  }
  lines.push('}');
  lines.push(String.raw`\vspace{2pt}`);

  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Template 5: Executive ───────────────────────────────────────────────────

function generateExecutive(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,11pt]{article}`,
    String.raw`\usepackage[left=0.8in,top=0.6in,right=0.8in,bottom=0.6in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{2pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{8pt}{\rule{\linewidth}{1.5pt}}\\[-2pt]%`,
    String.raw`  {\bfseries\Large #1}\\[-2pt]%`,
    String.raw`  {\rule{\linewidth}{0.5pt}}\vspace{4pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    String.raw`{\centering`,
    `  {\\fontsize{28}{34}\\selectfont\\textbf{${esc(locked.name)}}}\\\\[5pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`  {\\small ${contactParts.join(' \\quad ')}}\\\\`);
  }
  lines.push('}');
  lines.push(String.raw`\vspace{6pt}{\rule{\linewidth}{1.5pt}}`);

  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Template 6: Tech ────────────────────────────────────────────────────────

function generateTech(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,10.5pt]{article}`,
    String.raw`\usepackage[left=0.65in,top=0.5in,right=0.65in,bottom=0.5in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{courier}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{0pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{6pt}\texttt{\textbf{-- #1 --}}\vspace{1pt}\hrule\vspace{4pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    `{\\Large \\textbf{${esc(locked.name)}}}`,
  ];
  if (contactParts.length > 0) {
    lines.push(`\\\\{\\small\\ttfamily ${contactParts.join(' | ')}}\\\\`);
  }
  lines.push(String.raw`\vspace{2pt}\hrule`);

  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Template 7: Academic ────────────────────────────────────────────────────

function generateAcademic(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,11pt]{article}`,
    String.raw`\usepackage[left=1in,top=0.75in,right=1in,bottom=0.75in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{3pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{10pt}\noindent{\large\bfseries #1}\vspace{2pt}\hrule\vspace{5pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    String.raw`\begin{center}`,
    `  {\\LARGE \\textbf{${esc(locked.name)}}}\\\\[4pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`  ${contactParts.join(' $\\cdot$ ')}\\\\`);
  }
  lines.push(String.raw`\end{center}`);
  lines.push(String.raw`\hrule\vspace{4pt}`);

  // Education first for academic style
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Template 8: Minimalist ──────────────────────────────────────────────────

function generateMinimalist(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,11pt]{article}`,
    String.raw`\usepackage[left=1in,top=0.9in,right=1in,bottom=0.9in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{4pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{12pt}\noindent{\normalsize\bfseries\MakeUppercase{#1}}\vspace{6pt}\\%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    `{\\Huge ${esc(locked.name)}}\\\\[6pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`{\\small ${contactParts.join('\\quad ')}}\\\\`);
  }
  lines.push(String.raw`\vspace{8pt}`);

  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Template 9: Corporate ───────────────────────────────────────────────────

function generateCorporate(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,11pt]{article}`,
    String.raw`\usepackage[left=0.75in,top=0.55in,right=0.75in,bottom=0.55in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    String.raw`\usepackage{textcase}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{0pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{6pt}\noindent\textsc{\textbf{#1}}\vspace{1pt}\hrule height 0.6pt\vspace{4pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    String.raw`\begin{center}`,
    `  {\\fontsize{24}{28}\\selectfont\\textsc{${esc(locked.name)}}}\\\\[4pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`  {\\small ${contactParts.join(' $\\vert$ ')}}\\\\`);
  }
  lines.push(String.raw`\end{center}`);
  lines.push(String.raw`\noindent\rule{\linewidth}{0.8pt}`);
  lines.push(String.raw`\vspace{2pt}`);

  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Template 10: Bold ───────────────────────────────────────────────────────

function generateBold(locked: LockedResume, editable: EditableResume): string {
  const contactParts = buildContactParts(locked.contact);
  const lines: string[] = [
    String.raw`\documentclass[letterpaper,11pt]{article}`,
    String.raw`\usepackage[left=0.7in,top=0.5in,right=0.7in,bottom=0.5in]{geometry}`,
    String.raw`\usepackage[hidelinks]{hyperref}`,
    String.raw`\usepackage{enumitem}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    '',
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    String.raw`\setlength{\parskip}{0pt}`,
    '',
    String.raw`\newcommand{\ressection}[1]{%`,
    String.raw`  \vspace{8pt}{\rule{\linewidth}{2pt}}\\[1pt]%`,
    String.raw`  {\fontsize{12}{14}\selectfont\bfseries\MakeUppercase{#1}}\vspace{4pt}%`,
    '}',
    '',
    String.raw`\begin{document}`,
    '',
    `{\\fontsize{30}{36}\\selectfont\\bfseries ${esc(locked.name)}}\\\\[3pt]`,
    String.raw`{\rule{\linewidth}{2pt}}\\[3pt]`,
  ];
  if (contactParts.length > 0) {
    lines.push(`{\\small ${contactParts.join(' $|$ ')}}\\\\`);
  }
  lines.push(String.raw`\vspace{2pt}`);

  lines.push(...summaryBlock(editable, String.raw`\ressection`));
  lines.push(...skillsBlock(editable, String.raw`\ressection`));
  lines.push(...experienceBlock(editable, locked, String.raw`\ressection`, true));
  lines.push(...projectsBlock(editable, String.raw`\ressection`));
  lines.push(...educationBlock(locked, String.raw`\ressection`));
  lines.push('', String.raw`\end{document}`);
  return lines.join('\n');
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function generateLatex(
  templateId: LatexTemplateId,
  locked: LockedResume,
  editable: EditableResume,
): string {
  switch (templateId) {
    case 'modern':       return generateModern(locked, editable);
    case 'professional': return generateProfessional(locked, editable);
    case 'compact':      return generateCompact(locked, editable);
    case 'executive':    return generateExecutive(locked, editable);
    case 'tech':         return generateTech(locked, editable);
    case 'academic':     return generateAcademic(locked, editable);
    case 'minimalist':   return generateMinimalist(locked, editable);
    case 'corporate':    return generateCorporate(locked, editable);
    case 'bold':         return generateBold(locked, editable);
    default:             return generateClassic(locked, editable);
  }
}
