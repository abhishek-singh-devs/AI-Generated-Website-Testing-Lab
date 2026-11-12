import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Monitor, Smartphone, Tablet, Laptop, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge, scoreTone } from "./status";
import { BROWSERS, DEVICES, PROFILES } from "@/lib/testing/constants";
import { displayHost } from "@/lib/testing/url";
import { fmtAgo, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeviceId, TestRunRow } from "@/lib/testing/types";

const DEVICE_ICON: Record<DeviceId, typeof Monitor> = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };

export function SiteMark({ url }: { url: string }) {
  const host = displayHost(url);
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised font-mono text-xs font-semibold uppercase text-primary-glow">
      {host.charAt(0)}
    </div>
  );
}

export function RunsTable({ runs, compact = false }: { runs: TestRunRow[]; compact?: boolean }) {
  const navigate = useNavigate();
  const rerun = (id: string) => navigate({ to: "/tests/new", search: { rerun: id } });

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Website</th>
              <th className="px-3 py-3 font-medium">Profile</th>
              {!compact && <th className="px-3 py-3 font-medium">Environment</th>}
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Score</th>
              <th className="px-3 py-3 text-right font-medium">Issues</th>
              {!compact && <th className="px-3 py-3 text-right font-medium">Duration</th>}
              <th className="px-3 py-3 text-right font-medium">When</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const DIcon = DEVICE_ICON[r.device] ?? Monitor;
              return (
                <tr
                  key={r.id}
                  className="group cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40"
                  onClick={() => navigate({ to: "/runs/$runId", params: { runId: r.id } })}
                >
                  <td className="px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <SiteMark url={r.url} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{displayHost(r.url)}</div>
                        {r.is_sample && <div className="text-[11px] text-muted-foreground">Sample run</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="muted" className="rounded-full font-normal">{PROFILES[r.profile]?.label ?? r.profile}</Badge>
                  </td>
                  {!compact && (
                    <td className="px-3 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <DIcon className="size-3.5" />
                        {BROWSERS[r.browser]?.label} · {DEVICES[r.device]?.label}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums", scoreTone(r.score))}>{r.score ?? "—"}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {r.issues_count}
                    {r.critical_count > 0 && <span className="ml-1 text-destructive">({r.critical_count}!)</span>}
                  </td>
                  {!compact && <td className="px-3 py-3 text-right font-mono text-muted-foreground tabular-nums">{fmtDuration(r.duration_ms)}</td>}
                  <td className="whitespace-nowrap px-3 py-3 text-right text-muted-foreground">{fmtAgo(r.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label="Re-run test"
                            onClick={(e) => {
                              e.stopPropagation();
                              rerun(r.id);
                            }}
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Re-run</TooltipContent>
                      </Tooltip>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-border/50 md:hidden">
        {runs.map((r) => (
          <li key={r.id}>
            <Link to="/runs/$runId" params={{ runId: r.id }} className="flex items-center gap-3 px-4 py-3.5 active:bg-accent/40">
              <SiteMark url={r.url} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{displayHost(r.url)}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{PROFILES[r.profile]?.label}</span>·<span>{fmtAgo(r.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("font-mono text-sm font-semibold", scoreTone(r.score))}>{r.score ?? "—"}</span>
                <StatusBadge status={r.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}