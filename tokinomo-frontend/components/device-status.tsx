import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/lib/api/types";

const labels: Record<DeviceStatus, string> = {
  ONLINE: "online",
  OFFLINE: "offline",
  PROVISIONING: "provisioning",
  UNASSIGNED: "unassigned",
  ERROR: "error",
};

export function DeviceStatusDot({
  status,
  className,
}: {
  status: DeviceStatus;
  className?: string;
}) {
  const color =
    status === "ONLINE"
      ? "bg-[var(--color-online)]"
      : status === "ERROR"
        ? "bg-[var(--color-danger)]"
        : status === "PROVISIONING"
          ? "bg-[var(--color-warn)]"
          : "bg-[var(--color-offline)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[var(--text-sm)]",
        className,
      )}
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-none",
          color,
          status === "ONLINE" && "status-pulse",
        )}
        aria-hidden
      />
      <span className="text-[var(--color-ink-2)]">{labels[status]}</span>
    </span>
  );
}
