import type { Resume } from './schema';

// Sample profiles per Plan §6 Phase 1: seed Anurag, Shreya, Shivani.
// IDs inside experience/projects are stable so the editable bullets can
// be matched to their locked facts and to AI output.

export const SAMPLE_PROFILES: Resume[] = [
  {
    profileId: 'anurag-fullstack',
    locked: {
      name: 'Anurag Sharma',
      contact: {
        email: 'anurag@example.com',
        phone: '+91 98000 11111',
        location: 'Bengaluru, IN',
        linkedin: 'linkedin.com/in/anurag',
        github: 'github.com/anurag',
        website: '',
      },
      education: [
        {
          institution: 'IIT Bombay',
          degree: 'B.Tech',
          field: 'Computer Science',
          startYear: '2017',
          endYear: '2021',
          gpa: '8.6',
        },
      ],
      experienceFacts: [
        {
          id: 'exp-acme',
          title: 'Senior Software Engineer',
          company: 'Acme Corp',
          location: 'Remote',
          startDate: '2023-04',
          endDate: 'Present',
        },
        {
          id: 'exp-globex',
          title: 'Software Engineer',
          company: 'Globex',
          location: 'Bengaluru, IN',
          startDate: '2021-07',
          endDate: '2023-03',
        },
      ],
    },
    editable: {
      summary:
        'Full-stack engineer with 4+ years building production web platforms across React, Node.js, and Postgres. Comfortable owning features end-to-end from API design through UI polish.',
      skills: [
        'TypeScript',
        'React',
        'Node.js',
        'Next.js',
        'PostgreSQL',
        'Redis',
        'Docker',
        'AWS',
      ],
      experience: [
        {
          id: 'exp-acme',
          bullets: [
            'Led migration of monolithic API to modular service boundaries, cutting median p95 latency from 480ms to 180ms.',
            'Designed and shipped a real-time notifications system used by 30k weekly active users.',
            'Mentored two junior engineers; established the team\'s code review and on-call playbooks.',
          ],
        },
        {
          id: 'exp-globex',
          bullets: [
            'Built core checkout flow handling $4M monthly GMV with three payment providers.',
            'Reduced frontend bundle size 38% through route-based code splitting and dependency audits.',
            'Owned the analytics pipeline ingest path on Kafka + ClickHouse.',
          ],
        },
      ],
      projects: [
        {
          id: 'proj-meshboard',
          name: 'MeshBoard',
          description: 'Open-source collaborative whiteboard',
          bullets: [
            'CRDT-based sync with sub-50ms cursor latency over WebRTC.',
            'Reached 1.2k GitHub stars within six months of launch.',
          ],
          techStack: ['TypeScript', 'WebRTC', 'Yjs'],
        },
      ],
    },
  },
  {
    profileId: 'shreya-backend',
    locked: {
      name: 'Shreya Patil',
      contact: {
        email: 'shreya@example.com',
        phone: '+91 98000 22222',
        location: 'Pune, IN',
        linkedin: 'linkedin.com/in/shreya',
        github: 'github.com/shreya',
        website: '',
      },
      education: [
        {
          institution: 'COEP Pune',
          degree: 'B.E.',
          field: 'Information Technology',
          startYear: '2018',
          endYear: '2022',
          gpa: '9.1',
        },
      ],
      experienceFacts: [
        {
          id: 'exp-payflow',
          title: 'Backend Engineer',
          company: 'PayFlow',
          location: 'Pune, IN',
          startDate: '2022-08',
          endDate: 'Present',
        },
      ],
    },
    editable: {
      summary:
        'Backend engineer focused on payments infrastructure, distributed systems, and reliability. Strong with Go, Python, and event-driven architectures.',
      skills: ['Go', 'Python', 'gRPC', 'Kafka', 'Postgres', 'Kubernetes', 'Terraform'],
      experience: [
        {
          id: 'exp-payflow',
          bullets: [
            'Owned the ledger service responsible for $200M+ annual transaction volume.',
            'Implemented idempotent retry semantics that eliminated a class of double-charge incidents.',
            'Drove an SLO program and reduced ledger write error budget burn by 60%.',
          ],
        },
      ],
      projects: [],
    },
  },
  {
    profileId: 'shivani-frontend',
    locked: {
      name: 'Shivani Rao',
      contact: {
        email: 'shivani@example.com',
        phone: '+91 98000 33333',
        location: 'Hyderabad, IN',
        linkedin: 'linkedin.com/in/shivani',
        github: 'github.com/shivani',
        website: 'shivani.dev',
      },
      education: [
        {
          institution: 'IIIT Hyderabad',
          degree: 'B.Tech',
          field: 'Computer Science',
          startYear: '2017',
          endYear: '2021',
          gpa: '8.4',
        },
      ],
      experienceFacts: [
        {
          id: 'exp-luma',
          title: 'Frontend Engineer',
          company: 'Luma',
          location: 'Remote',
          startDate: '2023-01',
          endDate: 'Present',
        },
        {
          id: 'exp-indigo',
          title: 'UI Engineer',
          company: 'Indigo Labs',
          location: 'Hyderabad, IN',
          startDate: '2021-08',
          endDate: '2022-12',
        },
      ],
    },
    editable: {
      summary:
        'Frontend engineer with a strong design sensibility. Shipped polished, accessible interfaces in React and Svelte for B2B SaaS and consumer apps.',
      skills: [
        'TypeScript',
        'React',
        'Svelte',
        'Tailwind CSS',
        'Framer Motion',
        'Storybook',
        'Figma',
      ],
      experience: [
        {
          id: 'exp-luma',
          bullets: [
            'Rebuilt the public-facing event pages, lifting conversion-to-RSVP by 14% in A/B test.',
            'Owned the design system component library used by all product surfaces.',
            'Led accessibility remediation to reach WCAG 2.1 AA on the booking flow.',
          ],
        },
        {
          id: 'exp-indigo',
          bullets: [
            'Built the reporting dashboard with virtualized tables handling 100k+ rows.',
            'Migrated the marketing site from Gatsby to Next.js, cutting build times by 70%.',
          ],
        },
      ],
      projects: [
        {
          id: 'proj-paletteforge',
          name: 'PaletteForge',
          description: 'Color system generator for design teams',
          bullets: ['Featured on Product Hunt; 3k+ weekly visitors at peak.'],
          techStack: ['Svelte', 'TypeScript'],
        },
      ],
    },
  },
];
