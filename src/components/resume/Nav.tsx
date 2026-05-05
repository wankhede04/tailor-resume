import Link from 'next/link';

export function ResumeNav() {
  return (
    <header className="border-b border-bg-border bg-bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-text-primary">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-sm font-bold text-accent">
            R
          </span>
          <span className="text-sm font-semibold tracking-tight">Resume Tailor</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-text-secondary">
          <Link href="/" className="hover:text-text-primary">
            Profiles
          </Link>
          <Link href="/applications" className="hover:text-text-primary">
            Applications
          </Link>
        </nav>
      </div>
    </header>
  );
}
