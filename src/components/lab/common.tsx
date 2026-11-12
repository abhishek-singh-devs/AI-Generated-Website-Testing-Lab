import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("surface-panel", className)}>{children}</section>;
}

export function PanelHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary-glow">
        <Icon className="size-6" />
        <div className="absolute inset-0 -z-10 rounded-2xl bg-primary/30 blur-xl" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "primary", trend }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: "primary" | "success" | "warning" | "danger"; trend?: ReactNode }) {
  const toneCls = {
    primary: "text-primary-glow bg-primary/12 border-primary/25",
    success: "text-success bg-success/12 border-success/25",
    warning: "text-warning bg-warning/12 border-warning/25",
    danger: "text-destructive bg-destructive/12 border-destructive/25",
  }[tone];
  return (
    <div className="surface-panel relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={cn("grid size-10 place-items-center rounded-xl border", toneCls)}>
          <Icon className="size-5" />
        </div>
      </div>
      {(hint || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {trend}
          {hint}
        </div>
      )}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid size-8 place-items-center rounded-lg bg-gradient-primary shadow-glow", className)}>
      <svg viewBox="0 0 24 24" className="size-[18px] text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 3h6" />
        <path d="M10 3v6.5L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3" />
        <path d="M7.5 15h9" />
      </svg>
    </div>
  );
}