import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full min-w-0 border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 font-mono text-[var(--text-sm)] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-[border-color,background-color] duration-[var(--dur-micro)] outline-none hover:border-[var(--color-rule-2)] focus-visible:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-danger)]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 font-mono text-[var(--text-sm)] text-[var(--color-ink)] outline-none hover:border-[var(--color-rule-2)] focus-visible:border-[var(--color-accent)] disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 font-mono text-[var(--text-sm)] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] outline-none hover:border-[var(--color-rule-2)] focus-visible:border-[var(--color-accent)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
