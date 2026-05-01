import { cn } from '@/lib/cn';

export function Avatar({
  name,
  url,
  size = 'sm',
  className,
}: {
  name: string;
  url?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeClass =
    size === 'xs' ? 'h-5 w-5 text-[9px]' : size === 'md' ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-[10px]';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  if (url) {
    return (
      <img
        alt={name}
        src={url}
        title={name}
        className={cn('rounded-full bg-bg-border object-cover', sizeClass, className)}
      />
    );
  }

  return (
    <div
      title={name}
      className={cn(
        'flex items-center justify-center rounded-full bg-bg-border font-medium text-text-secondary',
        sizeClass,
        className,
      )}
    >
      {initials || '?'}
    </div>
  );
}
