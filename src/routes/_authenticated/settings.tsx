import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Radar, Bot, MonitorPlay, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, PanelHeader } from "@/components/lab/common";
import { DEFAULT_SETTINGS, clearMyHistory, invalidateRuns, keys, meQuery, saveSettings, settingsQuery } from "@/lib/lab-data";
import { BROWSERS, BROWSER_IDS, DEVICES, DEVICE_IDS, PROFILES, PROFILE_IDS } from "@/lib/testing/constants";
import type { BrowserId, DeviceId, TestProfile } from "@/lib/testing/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Website Testing Lab" },
      { name: "description", content: "Test defaults, pass threshold, execution and notification preferences." },
      { property: "og:title", content: "Settings — AI Website Testing Lab" },
      { property: "og:description", content: "Test defaults, pass threshold, execution and notification preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery(meQuery);
  const { data, isLoading } = useQuery(settingsQuery);
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      await qc.invalidateQueries({ queryKey: keys.settings });
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Couldn't save settings", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-[600px] rounded-xl" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Defaults for new tests and how the lab executes them." actions={<Button variant="glow" onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save changes</Button>} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Profile" />
          <div className="grid gap-4 p-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={form.display_name ?? ""} maxLength={60} onChange={(e) => set("display_name", e.target.value || null)} placeholder="Your name" />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input value={me?.email ?? ""} disabled />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Test defaults" description="Pre-selected on the New Test page" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Profile</Label>
              <Select value={form.default_profile} onValueChange={(v) => set("default_profile", v as TestProfile)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROFILE_IDS.map((p) => <SelectItem key={p} value={p}>{PROFILES[p].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Browser</Label>
              <Select value={form.default_browser} onValueChange={(v) => set("default_browser", v as BrowserId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BROWSER_IDS.map((b) => <SelectItem key={b} value={b}>{BROWSERS[b].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Device</Label>
              <Select value={form.default_device} onValueChange={(v) => set("default_device", v as DeviceId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEVICE_IDS.map((d) => <SelectItem key={d} value={d}>{DEVICES[d].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:col-span-3">
              <div className="flex items-center justify-between">
                <Label>Pass threshold</Label>
                <span className="font-mono text-sm text-primary-glow">{form.pass_threshold}/100</span>
              </div>
              <Slider min={50} max={100} step={1} value={[form.pass_threshold]} onValueChange={([v]) => set("pass_threshold", v ?? 80)} aria-label="Pass threshold" />
              <p className="text-xs text-muted-foreground">A run passes when nothing fails and its score is at least this. Any critical failure or a score under 50 always fails.</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Execution" description="What actually runs when you start a test" />
          <div className="space-y-4 p-5">
            <ToggleRow icon={Radar} title="Live page fetch" desc="Fetch the real page server-side for HTTP, header and HTML checks. Turn off for fully simulated runs." checked={form.live_probe} onChange={(v) => set("live_probe", v)} />
            <ProviderRow icon={MonitorPlay} title="Browser automation" desc="Rendering, overflow, contrast and Core Web Vitals need a hosted browser (e.g. Playwright). Not configured — these checks are simulated." />
            <ProviderRow icon={Bot} title="AI reviewer" desc="Custom instructions and summaries would use an AI model. Not configured — the reviewer is simulated." />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Notifications" description="Saved as preferences — email delivery isn't connected in this demo" />
          <div className="space-y-4 p-5">
            <ToggleRow title="Notify on failure" desc="Alert me when a run fails." checked={form.notify_on_failure} onChange={(v) => set("notify_on_failure", v)} />
            <ToggleRow title="Weekly digest" desc="Summary of pass rate and top issues every Monday." checked={form.weekly_digest} onChange={(v) => set("weekly_digest", v)} />
          </div>
        </Panel>
      </div>

      <Panel className="border-destructive/30">
        <PanelHeader title="Danger zone" />
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Delete every run you've started. Sample runs stay.</p>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={async () => {
              if (!window.confirm("Delete all of your test runs? This can't be undone.")) return;
              try {
                await clearMyHistory();
                await invalidateRuns(qc);
                toast.success("Your history was cleared");
              } catch (e) {
                toast.error("Couldn't clear history", { description: e instanceof Error ? e.message : undefined });
              }
            }}
          >
            <Trash2 /> Clear my history
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function ToggleRow({ icon: Icon, title, desc, checked, onChange }: { icon?: typeof Radar; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary-glow"><Icon className="size-4" /></span>}
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function ProviderRow({ icon: Icon, title, desc }: { icon: typeof Radar; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground"><Icon className="size-4" /></span>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Badge variant="warning" className="rounded-full">Simulated</Badge>
    </div>
  );
}