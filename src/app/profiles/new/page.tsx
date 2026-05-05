import Link from 'next/link';
import { ResumeNav } from '@/components/resume/Nav';
import { ProfileEditor } from '@/components/resume/ProfileEditor';

const TEMPLATE_LOCKED = {
  name: 'Your Name',
  contact: {
    email: 'you@example.com',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  },
  education: [
    {
      institution: 'University',
      degree: 'B.Tech',
      field: 'Computer Science',
      startYear: '2018',
      endYear: '2022',
      gpa: '',
    },
  ],
  experienceFacts: [
    {
      id: 'exp-1',
      title: 'Software Engineer',
      company: 'Acme',
      location: '',
      startDate: '2022-07',
      endDate: 'Present',
    },
  ],
};

const TEMPLATE_EDITABLE = {
  summary: 'Brief professional summary; the AI will rewrite this against the JD.',
  skills: ['TypeScript', 'React', 'Node.js'],
  experience: [
    {
      id: 'exp-1',
      bullets: [
        'Shipped feature X that improved metric Y by Z%.',
        'Owned subsystem A serving N requests/second.',
      ],
    },
  ],
  projects: [],
};

export default function NewProfilePage() {
  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 text-xs text-text-muted">
          <Link href="/" className="hover:text-text-secondary">
            Profiles
          </Link>{' '}
          / New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">New profile</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Edit the JSON below to match the candidate. The locked section holds facts the AI must
          never alter; the editable section is what gets tailored against each JD.
        </p>
        <div className="mt-6">
          <ProfileEditor
            mode="create"
            initial={{
              slug: '',
              displayName: '',
              locked: TEMPLATE_LOCKED,
              editable: TEMPLATE_EDITABLE,
            }}
          />
        </div>
      </div>
    </main>
  );
}
