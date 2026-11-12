import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Copy, Edit2, ExternalLink, Layers, Play, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, PanelHeader } from "@/components/lab/common";
import { suitesQuery, createSuite, updateSuite, deleteSuite, keys } from "@/lib/lab-data";
import { BROWSERS, DEVICES, PROFILES } from "@/lib/testing/constants";
import type { TestProfile, BrowserId, DeviceId, TestSuiteRow } from "@/lib/testing/types";

export const Route = createFileRoute("/_authenticated/suites")({
  head: () => ({ meta: [{ title: "Test Suites — AI Website Testing Lab" }, { name: "description", content: "Manage reusable website QA test configurations." }] }),
  component: SuitesPage,
});

type Draft = { name: string; description: string; target_url: string; profile: TestProfile; browser: BrowserId; device: DeviceId; schedule: TestSuiteRow["schedule"]; enabled: boolean };
const blank: Draft = { name: "", description: "", target_url: "", profile: "comprehensive", browser: "chromium", device: "desktop", schedule: "manual", enabled: true };
const toDraft = (s: TestSuiteRow): Draft => ({ name: s.name, description: s.description ?? "", target_url: s.target_url, profile: s.profile, browser: s.browsers[0] ?? "chromium", device: s.devices[0] ?? "desktop", schedule: s.schedule, enabled: s.enabled });

function SuitesPage() {
  const qc = useQueryClient();
  const suites = useQuery(suitesQuery);
  const [draft, setDraft] = useState<Draft>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: keys.suites });
  const closeForm = () => { setFormOpen(false); setEditing(null); setDraft(blank); };
  const create = useMutation({ mutationFn: (d: Draft) => createSuite({ ...d, description: d.description.trim() || null, browsers: [d.browser], devices: [d.device] }), onSuccess: async () => { await refresh(); toast.success("Suite created"); closeForm(); }, onError: (e) => toast.error("Couldn't create suite", { description: e.message }) });
  const update = useMutation({ mutationFn: ({ id, d }: { id: string; d: Draft }) => updateSuite(id, { ...d, description: d.description.trim() || null, browsers: [d.browser], devices: [d.device] }), onSuccess: async () => { await refresh(); toast.success("Suite updated"); closeForm(); }, onError: (e) => toast.error("Couldn't update suite", { description: e.message }) });
  const remove = useMutation({ mutationFn: deleteSuite, onSuccess: async () => { await refresh(); toast.success("Suite deleted"); }, onError: (e) => toast.error("Couldn't delete suite", { description: e.message }) });
  const openNew = () => { setDraft(blank); setEditing(null); setFormOpen(true); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (!draft.name.trim() || !draft.target_url.trim()) { toast.error("Suite name and target URL are required"); return; } if (editing) update.mutate({ id: editing, d: draft }); else create.mutate(draft); };
  const filtered = (suites.data ?? []).filter(s => [s.name, s.description ?? "", s.target_url].some(v => v.toLowerCase().includes(search.toLowerCase())));
  const toggle = (s: TestSuiteRow) => update.mutate({ id: s.id, d: { ...toDraft(s), enabled: !s.enabled } });
  const duplicate = (s: TestSuiteRow) => create.mutate({ ...toDraft(s), name: s.name + " (copy)", enabled: false });

  return <div className="space-y-6">
    <PageHeader title="Test Suites" description="Save reusable test configurations, then launch runs against them." actions={<Button onClick={openNew}><Plus className="size-4" /> Create suite</Button>} />
    <div className="rounded-lg border border-warning/25 bg-warning/8 px-4 py-3 text-xs text-warning">Schedules are configuration-only in this demo. Daily/weekly suites are not automatically executed.</div>
    <Panel><PanelHeader title="Your suites" description={suites.data ? `${suites.data.length} saved suite${suites.data.length === 1 ? "" : "s"}` : "Reusable test profiles"} />
      <div className="p-4"><Input aria-label="Search suites" placeholder="Search by name or target URL…" value={search} onChange={e => setSearch(e.target.value)} className="mb-4" />
        {suites.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading suites…</p> : suites.isError ? <p className="py-8 text-center text-sm text-destructive">Couldn't load suites: {suites.error.message}</p> : filtered.length === 0 ? <div className="py-12 text-center"><Layers className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-medium">{search ? "No matching suites" : "No suites yet"}</p><p className="mt-1 text-sm text-muted-foreground">Create a suite to save a website, profile, browser, and device.</p><Button variant="outline" className="mt-4" onClick={openNew}><Plus className="size-4" /> Create your first suite</Button></div> :
        <div className="space-y-3">{filtered.map(s => <div key={s.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{s.name}</h3><Badge variant={s.enabled ? "success" : "muted"}>{s.enabled ? "Enabled" : "Disabled"}</Badge>{s.is_sample && <Badge variant="outline">Sample</Badge>}</div>
            {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
            <a href={s.target_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-primary hover:underline">{s.target_url}<ExternalLink className="size-3 shrink-0" /></a>
            <div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary">{PROFILES[s.profile].label}</Badge><Badge variant="outline">{BROWSERS[s.browsers[0] ?? "chromium"].label}</Badge><Badge variant="outline">{DEVICES[s.devices[0] ?? "desktop"].label}</Badge><Badge variant="outline">{s.schedule === "manual" ? "Manual" : s.schedule === "daily" ? "Daily" : "Weekly"}</Badge></div></div>
          <div className="flex flex-wrap gap-1"><Button asChild size="sm"><Link to="/tests/new" search={{ suite: s.id }}><Play className="size-3.5" /> Run now</Link></Button>
            <Button variant="ghost" size="icon" aria-label={s.enabled ? "Disable suite" : "Enable suite"} onClick={() => toggle(s)}>{s.enabled ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}</Button>
            <Button variant="ghost" size="icon" aria-label="Edit suite" onClick={() => { setDraft(toDraft(s)); setEditing(s.id); setFormOpen(true); }}><Edit2 className="size-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Duplicate suite" onClick={() => duplicate(s)}><Copy className="size-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Delete suite" disabled={s.is_sample} onClick={() => { if (window.confirm(`Delete suite "${s.name}"?`)) remove.mutate(s.id); }}><Trash2 className="size-4 text-destructive" /></Button></div>
        </div></div>)}</div>}
      </div></Panel>
    {formOpen && <Panel><PanelHeader title={editing ? "Edit suite" : "Create suite"} description="Configure the reusable run settings." /><form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
      <div><Label htmlFor="suite-name">Name</Label><Input id="suite-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} maxLength={80} required /></div>
      <div><Label htmlFor="suite-url">Target URL</Label><Input id="suite-url" type="url" placeholder="https://example.com" value={draft.target_url} onChange={e => setDraft({ ...draft, target_url: e.target.value })} required /></div>
      <div className="sm:col-span-2"><Label htmlFor="suite-description">Description (optional)</Label><Textarea id="suite-description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={2} maxLength={500} /></div>
      <div><Label htmlFor="suite-profile">Test profile</Label><select id="suite-profile" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.profile} onChange={e => setDraft({ ...draft, profile: e.target.value as TestProfile })}>{Object.entries(PROFILES).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select></div>
      <div><Label htmlFor="suite-browser">Browser</Label><select id="suite-browser" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.browser} onChange={e => setDraft({ ...draft, browser: e.target.value as BrowserId })}>{Object.entries(BROWSERS).map(([id, b]) => <option key={id} value={id}>{b.label}</option>)}</select></div>
      <div><Label htmlFor="suite-device">Device</Label><select id="suite-device" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.device} onChange={e => setDraft({ ...draft, device: e.target.value as DeviceId })}>{Object.entries(DEVICES).map(([id, d]) => <option key={id} value={id}>{d.label} · {d.viewport}</option>)}</select></div>
      <div><Label htmlFor="suite-schedule">Schedule</Label><select id="suite-schedule" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.schedule} onChange={e => setDraft({ ...draft, schedule: e.target.value as Draft["schedule"] })}><option value="manual">Manual</option><option value="daily">Daily (not automated)</option><option value="weekly">Weekly (not automated)</option></select></div>
      <div className="sm:col-span-2 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={closeForm}>Cancel</Button><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? "Save changes" : "Create suite"}</Button></div>
    </form></Panel>}
  </div>;
}