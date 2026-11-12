import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, Loader2, FlaskConical, Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CheckStatus, RunStatus, Severity } from "@/lib/testing/types";

const RUN_STATUS: Record<RunStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" }> = {
  passed: { label: "Passed", variant: "success" },
  warning: { label: "Warnings", variant: "warning" },
  failed: { label: "Failed", variant: "danger" },
  running: { label: "Running", variant: "info" },
  error: { label: "Error", variant: "muted" },
};

export function StatusBadge({ status, className }: { status: RunStatus; className?: string }) {
  const s = RUN_STATUS[status] ?? RUN_STATUS.error;
  return (
    <Badge variant={s.variant} className={cn("gap-1.5 rounded-full font-medium", className)}>
      {status === "running" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      )}
      {s.label}
    </Badge>
  );
}

const SEVERITY: Record<Severity, "danger" | "warning" | "info" | "muted" | "primary"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "info",
  info: "muted",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge
      variant={SEVERITY[severity]}
      className={cn("rounded-full px-2 py-0 text-[11px] font-medium capitalize", severity === "critical" && "ring-1 ring-destructive/40", className)}
    >
      {severity}
    </Badge>
  );
}

export function CheckIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const cls = cn("size-4 shrink-0", className);
  if (status === "pass") return <CheckCircle2 className={cn(cls, "text-success")} aria-label="Pass" />;
  if (status === "fail") return <XCircle className={cn(cls, "text-destructive")} aria-label="Fail" />;
  if (status === "warn") return <AlertTriangle className={cn(cls, "text-warning")} aria-label="Warning" />;
  return <MinusCircle className={cn(cls, "text-muted-foreground")} aria-label="Skipped" />;
}

export function SourceBadge({ source }: { source: "measured" | "simulated" }) {
  return source === "measured" ? (
    <Badge variant="primary" className="gap-1 rounded-full px-2 py-0 text-[11px] font-medium">
      <Radar className="size-3" /> Measured
    </Badge>
  ) : (
    <Badge variant="muted" className="gap-1 rounded-full px-2 py-0 text-[11px] font-medium">
      <FlaskConical className="size-3" /> Simulated
    </Badge>
  );
}

export function scoreTone(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 85) return "text-success";
  if (score >= 65) return "text-warning";
  return "text-destructive";
}