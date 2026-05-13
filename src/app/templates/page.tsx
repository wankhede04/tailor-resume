import Link from 'next/link';
import { ResumeNav } from '@/components/resume/Nav';
import { LATEX_TEMPLATE_LIST } from '@/lib/resume/latex-templates';
import { TemplatePreview } from '@/components/resume/TemplatePreview';

export default function TemplatesPage() {
  return (
    <main className="min-h-screen">
      <ResumeNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-1 text-xs text-text-muted">
            <Link href="/" className="hover:text-text-secondary">Profiles</Link> / Templates
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">LaTeX Templates</h1>
          <p className="mt-1 text-sm text-text-secondary">
            10 ATS-friendly templates. Choose one from the review page before generating LaTeX.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {LATEX_TEMPLATE_LIST.map((t) => (
            <div key={t.id} className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-bg-border bg-white shadow-sm">
                <TemplatePreview templateId={t.id} />
              </div>
              <div>
                <span className="text-sm font-semibold text-text-primary">{t.label}</span>
                <span className="ml-2 rounded bg-bg-raised px-1.5 py-0.5 font-mono text-[10px] text-text-muted">{t.id}</span>
                <p className="mt-0.5 text-xs text-text-muted">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
