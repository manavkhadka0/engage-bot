import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "border border-[var(--color-rule)] bg-[var(--color-paper-2)]",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-rule)] px-4 py-2.5">
          {title ? (
            <h2 className="text-[var(--text-sm)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="min-w-0 border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
      <div className="text-[var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
        {label}
      </div>
      <div className="mt-2 font-mono text-[clamp(1.5rem,3vw,2rem)] leading-none text-[var(--color-accent)] tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-[var(--text-xs)] text-[var(--color-muted)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-[var(--color-rule-2)] px-6 py-10 text-center">
      <p className="text-[var(--color-accent)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[var(--text-sm)] text-[var(--color-muted)]">
        {body}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
