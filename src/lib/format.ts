import { formatDistanceToNowStrict, format } from "date-fns";

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

export function fmtAgo(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

export function fmtDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · HH:mm");
}