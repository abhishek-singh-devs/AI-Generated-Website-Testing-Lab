import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { hydrateChecks } from "@/lib/testing/engine";
import { DEFAULT_PASS_THRESHOLD } from "@/lib/testing/constants";
import type { TestRunRow, TestSuiteRow, UserSettingsRow, CheckResult } from "@/lib/testing/types";

type RawRun = Omit<TestRunRow, "checks"> & { checks: Json };

function toRun(r: RawRun): TestRunRow {
  return { ...r, checks: hydrateChecks(r.checks) } as TestRunRow;
}

export const keys = {
  me: ["me"] as const,
  runs: ["runs"] as const,
  run: (id: string) => ["runs", id] as const,
  suites: ["suites"] as const,
  settings: ["settings"] as const,
};

export const meQuery = queryOptions({
  queryKey: keys.me,
  queryFn: async () => {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
  staleTime: 60_000,
});

export const runsQuery = queryOptions({
  queryKey: keys.runs,
  queryFn: async (): Promise<TestRunRow[]> => {
    const { data, error } = await supabase
      .from("test_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data as RawRun[]).map(toRun);
  },
});

export const runQuery = (id: string) =>
  queryOptions({
    queryKey: keys.run(id),
    queryFn: async (): Promise<TestRunRow | null> => {
      const { data, error } = await supabase.from("test_runs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? toRun(data as RawRun) : null;
    },
  });

export const suitesQuery = queryOptions({
  queryKey: keys.suites,
  queryFn: async (): Promise<TestSuiteRow[]> => {
    const { data, error } = await supabase
      .from("test_suites")
      .select("*")
      .order("is_sample", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TestSuiteRow[];
  },
});

export const DEFAULT_SETTINGS: Omit<UserSettingsRow, "user_id" | "updated_at"> = {
  display_name: null,
  default_profile: "comprehensive",
  default_browser: "chromium",
  default_device: "desktop",
  pass_threshold: DEFAULT_PASS_THRESHOLD,
  notify_on_failure: true,
  live_probe: true,
  weekly_digest: false,
};

export const settingsQuery = queryOptions({
  queryKey: keys.settings,
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ...DEFAULT_SETTINGS };
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as typeof DEFAULT_SETTINGS;
  },
});

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You need to be signed in.");
  return data.user.id;
}

export interface NewRunInput {
  url: string;
  profile: TestRunRow["profile"];
  browser: TestRunRow["browser"];
  device: TestRunRow["device"];
  instructions: string | null;
  suite_id: string | null;
  status: TestRunRow["status"];
  score: number;
  duration_ms: number;
  checks: CheckResult[];
  summary: string;
  issues_count: number;
  critical_count: number;
  mode: string;
  created_at: string;
}

export async function insertRun(input: NewRunInput): Promise<string> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("test_runs")
    .insert({ ...input, checks: input.checks as unknown as Json, user_id, completed_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteRun(id: string) {
  const { error } = await supabase.from("test_runs").delete().eq("id", id);
  if (error) throw error;
}

export type SuiteInput = Pick<
  TestSuiteRow,
  "name" | "description" | "target_url" | "profile" | "browsers" | "devices" | "schedule" | "enabled"
>;

export async function createSuite(input: SuiteInput) {
  const user_id = await requireUserId();
  const { error } = await supabase.from("test_suites").insert({ ...input, user_id });
  if (error) throw error;
}

export async function updateSuite(id: string, input: Partial<SuiteInput>) {
  const { error } = await supabase.from("test_suites").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteSuite(id: string) {
  const { error } = await supabase.from("test_suites").delete().eq("id", id);
  if (error) throw error;
}

export async function saveSettings(input: Partial<typeof DEFAULT_SETTINGS>) {
  const user_id = await requireUserId();
  const { error } = await supabase.from("user_settings").upsert({ user_id, ...input });
  if (error) throw error;
}

export async function clearMyHistory() {
  const user_id = await requireUserId();
  const { error } = await supabase.from("test_runs").delete().eq("user_id", user_id);
  if (error) throw error;
}

export function invalidateRuns(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: keys.runs });
}