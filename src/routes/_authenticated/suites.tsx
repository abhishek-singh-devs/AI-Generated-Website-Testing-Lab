import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Layers, Plus, Play, Pencil, Trash2, Copy, Search, CalendarClock, Loader2, Monitor, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel } from "@/components/lab/common";
import { StatusBadge, scoreTone } from "@/components/lab/status";
import { SiteMark } from "@/components/lab/runs-table";
import { createSuite, deleteSuite, keys, runsQuery, suitesQuery, updateSuite, type SuiteInput } from "@/lib/lab-data";
import { BROWSERS, BROWSER_IDS, DEVICES, DEVICE_IDS, PROFILES, PROFILE_IDS } from "@/lib/testing/constants";
import { displayHost, validateUrl } from "@/lib/testing/url";
import { fmtAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BrowserId, DeviceId, TestProfile, TestRunRow, TestSuiteRow } from "@/lib/testing/types";

export const Route = createFileRoute("/_authenticated/suites")({
  head: () => ({
    meta: [
      { title: "Test suites — AI Website Testing Lab" },
      { name: "description", content: "Saved test configurations you can run again in one click." },
      { property: "og:title", content: "Test suites — AI Website Testing Lab" },
      { property: "og:description", content: "Saved test configurations you can run again in one click." },
    ],
  }),
  component: SuitesPage,
});

const SCHEDULE_LABEL: Record<TestSuiteRow["schedule"], string> = { manual: "Manual", daily: "Daily", weekly: "Weekly" };

const EMPTY_FORM: SuiteInput = {
  name: "",
  description: null,
  target_url: "",
  profile: "comprehensive",
  browsers: ["chromium"],
  devices: ["desktop"],
  schedule: "manual",
  enabled: true,
};

function SuitesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const suites = useQuery(suitesQuery);
  const runs = useQuery(runsQuery);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; form: SuiteInput } | null>(null);
  const [deleting, setDeleting] = useState<TestSuiteRow | null>(null);

  const lastRunBySuite = useMemo(() => {
    const m = new Map<string, TestRunRow>();
    for (const r of runs.data ?? []) if (r.suite_id && !m.has(r.suite_id)) m.set(r.suite_id, r);
    return m;
  }, [runs.data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (suites.data ?? []).filter((s) => !term || s.name.toLowerCase().includes(term) || s.target_url.toLowerCase().includes(term));
  }, [suites.data, q]);
  const mine = filtered.filter((s) => !s.is_sample);
  const samples = filtered.filter((s) => s.is_sample);

  const refresh = () => qc.invalidateQueries({ queryKey: keys.suites });

  const toggle = async (s: TestSuiteRow, enabled: boolean) => {
    try {
      await updateSuite(s.id, { enabled });
      await refresh();
      toast.success(enabled ? "Suite enabled" : "Suite paused");
    } catch (e) {
      toast.error("Couldn't update suite", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteSuite(deleting.id);
      await refresh();
      toast.success("Suite deleted");
    } catch (e) {
      toast.error("Couldn't delete suite", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setDeleting(null);
    }
  };

  const fromSuite = (s: TestSuiteRow, copy: boolean): SuiteInput => ({
    name: copy ? `${s.name} (copy)` : s.name,
    description: s.description,
    target_url: s.target_url,
    profile: s.profile,
    browsers: s.browsers,
    devices: s.devices,
    schedule: s.schedule,
    enabled: s.enabled,
  });

  const run = (s: TestSuiteRow) => navigate({ to: "/tests/new", search: { suite: s.id } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test suites"
        description="Save a site, profile and environment once, then re-run it whenever the generated site changes."
        actions={
          <Button variant="glow" onClick={() => setEditing({ id: null, form: { ...EMPTY_FORM } })}>
            <Plus /> New suite
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search suites or URLs" className="pl-9" aria-label="Search suites" />
      </div>

      {suites.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : suites.isError ? (
        <Panel><EmptyState icon={Layers} title="Couldn't load suites" description="Check your connection and try again." action={<Button variant="outline" onClick={() => suites.refetch()}>Retry</Button>} /></Panel>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Your suites <span className="font-mono">({mine.length})</span></h2>
            {mine.length === 0 ? (
              <Panel>
                <EmptyState
                  icon={Layers}
                  title={q ? "No suites match your search" : "No suites yet"}
                  description={q ? "Try a different name or URL." : "Create a suite to keep a site's test setup ready, or duplicate one of the samples below."}
                  action={!q && <Button variant="glow" onClick={() => setEditing({ id: null, form: { ...EMPTY_FORM } })}><Plus /> Create your first suite</Button>}
                />
              </Panel>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {mine.map((s) => (
                  <SuiteCard key={s.id} suite={s} lastRun={lastRunBySuite.get(s.id)} onRun={() => run(s)} onEdit={() => setEditing({ id: s.id, form: fromSuite(s, false) })} onDuplicate={() => setEditing({ id: null, form: fromSuite(s, true) })} onDelete={() => setDeleting(s)} onToggle={(v) => toggle(s, v)} />
                ))}
              </div>
            )}
          </section>

          {samples.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Sample suites <span className="font-normal">· read-only, duplicate to customise</span></h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {samples.map((s) => (
                  <SuiteCard key={s.id} suite={s} lastRun={lastRunBySuite.get(s.id)} onRun={() => run(s)} onDuplicate={() => setEditing({ id: null, form: fromSuite(s, true) })} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <SuiteDialog state={editing} onClose={() => setEditing(null)} onSaved={refresh} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>The suite is removed. Past runs stay in your test history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete suite</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SuiteCard({
  suite: s,
  lastRun,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
}: {
  suite: TestSuiteRow;
  lastRun: TestRunRow | undefined;
  onRun: () => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  onToggle?: (v: boolean) => void;
}) {
  return (
    <Panel className={cn("flex flex-col p-5 transition-colors hover:border-primary/40", !s.enabled && "opacity-70")}>
      <div className="flex items-start gap-3">
        <SiteMark url={s.target_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{s.name}</h3>
            {s.is_sample && <Badge variant="outline" className="shrink-0 border-primary/30 text-[10px] text-primary-glow">Sample</Badge>}
          </div>
          <a href={s.target_url} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs text-muted-foreground hover:text-foreground">
            {displayHost(s.target_url)}
          </a>
        </div>
        {onToggle && <Switch checked={s.enabled} onCheckedChange={onToggle} aria-label={s.enabled ? "Pause suite" : "Enable suite"} />}
      </div>

      {s.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
        <Badge variant="secondary" className="font-normal">{PROFILES[s.profile].label}</Badge>
        <Badge variant="secondary" className="gap-1 font-normal"><Globe className="size-3" />{s.browsers.map((b) => BROWSERS[b]?.label ?? b).join(", ")}</Badge>
        <Badge variant="secondary" className="gap-1 font-normal"><Monitor className="size-3" />{s.devices.map((d) => DEVICES[d]?.label ?? d).join(", ")}</Badge>
        <Badge variant="secondary" className="gap-1 font-normal"><CalendarClock className="size-3" />{SCHEDULE_LABEL[s.schedule]}</Badge>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-border/70 bg-surface px-3 py-2 text-xs">
        {lastRun ? (
          <>
            <Link to="/runs/$runId" params={{ runId: lastRun.id }} className="flex items-center gap-2 hover:underline">
              <StatusBadge status={lastRun.status} />
              <span className="text-muted-foreground">{fmtAgo(lastRun.created_at)}</span>
            </Link>
            <span className={cn("font-mono font-semibold", scoreTone(lastRun.score))}>{lastRun.score ?? "—"}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Not run yet</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 pt-1">
        <Button size="sm" variant="glow" className="flex-1" onClick={onRun} disabled={!s.enabled}>
          <Play /> Run now
        </Button>
        {onEdit && <Button size="icon" variant="outline" className="size-8" onClick={onEdit} aria-label="Edit suite"><Pencil /></Button>}
        <Button size="icon" variant="outline" className="size-8" onClick={onDuplicate} aria-label="Duplicate suite"><Copy /></Button>
        {onDelete && <Button size="icon" variant="outline" className="size-8 hover:text-destructive" onClick={onDelete} aria-label="Delete suite"><Trash2 /></Button>}
      </div>
    </Panel>
  );
}

function SuiteDialog({ state, onClose, onSaved }: { state: { id: string | null; form: SuiteInput } | null; onClose: () => void; onSaved: () => Promise<unknown> }) {
  return (
    <Dialog open={Boolean(state)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {state && <SuiteForm key={state.id ?? "new"} id={state.id} initial={state.form} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function SuiteForm({ id, initial, onClose, onSaved }: { id: string | null; initial: SuiteInput; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [form, setForm] = useState<SuiteInput>(initial);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SuiteInput>(k: K, v: SuiteInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { toast.error("Give the suite a name."); return; }
    const v = validateUrl(form.target_url);
    if (!v.ok) {
      setUrlError(v.error);
      return;
    }
    if (form.browsers.length === 0) { toast.error("Pick at least one browser."); return; }
    if (form.devices.length === 0) { toast.error("Pick at least one device."); return; }
    setBusy(true);
    try {
      const payload = { ...form, name, target_url: v.url, description: form.description?.trim() || null };
      if (id) await updateSuite(id, payload);
      else await createSuite(payload);
      await onSaved();
      toast.success(id ? "Suite updated" : "Suite created");
      onClose();
    } catch (err) {
      toast.error("Couldn't save suite", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{id ? "Edit suite" : "New suite"}</DialogTitle>
        <DialogDescription>Runs from a suite use its first selected browser and device.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="s-name">Name</Label>
        <Input id="s-name" value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="Marketing site — release check" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="s-url">Website URL</Label>
        <Input id="s-url" value={form.target_url} onChange={(e) => { set("target_url", e.target.value); setUrlError(null); }} placeholder="example.com" aria-invalid={Boolean(urlError)} className={cn("font-mono", urlError && "border-destructive")} />
        {urlError && <p className="text-xs text-destructive">{urlError}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="s-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea id="s-desc" rows={2} maxLength={300} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Profile</Label>
          <Select value={form.profile} onValueChange={(v) => set("profile", v as TestProfile)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROFILE_IDS.map((p) => <SelectItem key={p} value={p}>{PROFILES[p].label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Schedule</Label>
          <Select value={form.schedule} onValueChange={(v) => set("schedule", v as TestSuiteRow["schedule"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["manual", "daily", "weekly"] as const).map((s) => <SelectItem key={s} value={s}>{SCHEDULE_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.schedule !== "manual" && (
        <p className="-mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          Scheduling is saved but not executed in this demo — run suites manually with “Run now”.
        </p>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Browsers</legend>
        <div className="grid grid-cols-2 gap-2">
          {BROWSER_IDS.map((b) => (
            <label key={b} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary/50 has-[:checked]:bg-primary/8">
              <Checkbox checked={form.browsers.includes(b)} onCheckedChange={() => set("browsers", toggleIn<BrowserId>(form.browsers, b))} />
              {BROWSERS[b].label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Devices</legend>
        <div className="grid grid-cols-2 gap-2">
          {DEVICE_IDS.map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary/50 has-[:checked]:bg-primary/8">
              <Checkbox checked={form.devices.includes(d)} onCheckedChange={() => set("devices", toggleIn<DeviceId>(form.devices, d))} />
              {DEVICES[d].label}
            </label>
          ))}
        </div>
      </fieldset>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="glow" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{id ? "Save changes" : "Create suite"}</Button>
      </DialogFooter>
    </form>
  );
}