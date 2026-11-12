-- Test suites: saved test configurations
CREATE TABLE public.test_suites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  description text,
  target_url text NOT NULL,
  profile text NOT NULL DEFAULT 'smoke',
  browsers text[] NOT NULL DEFAULT ARRAY['chromium']::text[],
  devices text[] NOT NULL DEFAULT ARRAY['desktop']::text[],
  schedule text NOT NULL DEFAULT 'manual',
  enabled boolean NOT NULL DEFAULT true,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT test_suites_profile_chk CHECK (profile IN ('smoke','accessibility','responsive','performance','seo','comprehensive')),
  CONSTRAINT test_suites_schedule_chk CHECK (schedule IN ('manual','daily','weekly')),
  CONSTRAINT test_suites_name_len CHECK (char_length(name) BETWEEN 1 AND 120)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_suites TO authenticated;
GRANT ALL ON public.test_suites TO service_role;
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own and sample suites" ON public.test_suites FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND is_sample));
CREATE POLICY "Create own suites" ON public.test_suites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_sample = false);
CREATE POLICY "Update own suites" ON public.test_suites FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND is_sample = false);
CREATE POLICY "Delete own suites" ON public.test_suites FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX test_suites_user_idx ON public.test_suites (user_id, created_at DESC);

-- Test runs: one execution of a test profile against a URL
CREATE TABLE public.test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  suite_id uuid REFERENCES public.test_suites(id) ON DELETE SET NULL,
  url text NOT NULL,
  profile text NOT NULL,
  browser text NOT NULL DEFAULT 'chromium',
  device text NOT NULL DEFAULT 'desktop',
  instructions text,
  status text NOT NULL DEFAULT 'running',
  score integer,
  duration_ms integer,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  issues_count integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'simulated',
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT test_runs_profile_chk CHECK (profile IN ('smoke','accessibility','responsive','performance','seo','comprehensive')),
  CONSTRAINT test_runs_status_chk CHECK (status IN ('running','passed','warning','failed','error')),
  CONSTRAINT test_runs_score_chk CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  CONSTRAINT test_runs_url_len CHECK (char_length(url) <= 2048),
  CONSTRAINT test_runs_instr_len CHECK (instructions IS NULL OR char_length(instructions) <= 1000)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_runs TO authenticated;
GRANT ALL ON public.test_runs TO service_role;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own and sample runs" ON public.test_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND is_sample));
CREATE POLICY "Create own runs" ON public.test_runs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_sample = false);
CREATE POLICY "Update own runs" ON public.test_runs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND is_sample = false);
CREATE POLICY "Delete own runs" ON public.test_runs FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX test_runs_user_idx ON public.test_runs (user_id, created_at DESC);
CREATE INDEX test_runs_suite_idx ON public.test_runs (suite_id);

-- Per-user preferences
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY,
  display_name text,
  default_profile text NOT NULL DEFAULT 'comprehensive',
  default_browser text NOT NULL DEFAULT 'chromium',
  default_device text NOT NULL DEFAULT 'desktop',
  pass_threshold integer NOT NULL DEFAULT 80,
  notify_on_failure boolean NOT NULL DEFAULT true,
  live_probe boolean NOT NULL DEFAULT true,
  weekly_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_threshold_chk CHECK (pass_threshold BETWEEN 50 AND 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own settings" ON public.user_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Create own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own settings" ON public.user_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own settings" ON public.user_settings FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER test_suites_touch BEFORE UPDATE ON public.test_suites FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER user_settings_touch BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sample data (visible to every signed-in user, read-only)
CREATE FUNCTION public._seed_checks(spec text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', split_part(x, ':', 1),
    'status', CASE split_part(x, ':', 2) WHEN 'p' THEN 'pass' WHEN 'f' THEN 'fail' WHEN 'w' THEN 'warn' ELSE 'skip' END,
    'durationMs', split_part(x, ':', 3)::int) ORDER BY ord), '[]'::jsonb)
  FROM unnest(string_to_array(spec, ',')) WITH ORDINALITY AS t(x, ord)
$$;

INSERT INTO public.test_suites (id, user_id, name, description, target_url, profile, browsers, devices, schedule, enabled, is_sample, created_at, updated_at) VALUES
('a1000000-0000-4000-8000-000000000001', NULL, 'Marketing site release gate', 'Full sweep before every launch of the generated marketing site.', 'https://fernleaf-cafe.lovable.app', 'comprehensive', ARRAY['chromium','webkit']::text[], ARRAY['desktop','mobile']::text[], 'daily', true, true, now() - interval '20 days', now() - interval '1 days'),
('a1000000-0000-4000-8000-000000000002', NULL, 'Checkout accessibility', 'WCAG heuristics on the generated storefront checkout.', 'https://northwind-goods.lovable.app/checkout', 'accessibility', ARRAY['chromium','firefox']::text[], ARRAY['desktop']::text[], 'weekly', true, true, now() - interval '23 days', now() - interval '2 days'),
('a1000000-0000-4000-8000-000000000003', NULL, 'Mobile layout regression', 'Catch overflow and tap-target regressions on small screens.', 'https://pulse-fitness.lovable.app', 'responsive', ARRAY['webkit']::text[], ARRAY['mobile','tablet']::text[], 'manual', true, true, now() - interval '26 days', now() - interval '3 days'),
('a1000000-0000-4000-8000-000000000004', NULL, 'Blog SEO audit', 'Titles, descriptions and social tags on AI-written posts.', 'https://orbit-journal.lovable.app/blog', 'seo', ARRAY['chromium']::text[], ARRAY['desktop']::text[], 'weekly', true, true, now() - interval '29 days', now() - interval '4 days');

INSERT INTO public.test_runs (user_id, suite_id, url, profile, browser, device, instructions, status, score, duration_ms, checks, summary, issues_count, critical_count, mode, is_sample, created_at, completed_at) VALUES
(NULL, 'a1000000-0000-4000-8000-000000000001', 'https://fernleaf-cafe.lovable.app/', 'comprehensive', 'chromium', 'desktop', NULL, 'passed', 93, 13999, public._seed_checks('smoke.reachable:p:497,smoke.https:p:1500,smoke.title:p:1474,smoke.charset:p:519,smoke.favicon:p:874,smoke.headers:p:659,smoke.console:p:427,smoke.links:w:601,a11y.lang:p:881,a11y.alt:p:838,a11y.labels:p:458,a11y.buttons:p:758,a11y.h1:p:877,a11y.contrast:p:1235,a11y.focus:w:671,resp.viewport:p:848,resp.zoom:p:361,resp.overflow:p:792,resp.tap:p:255,resp.fixed:p:711,perf.ttfb:w:1438,perf.size:p:1206,perf.compression:p:652,perf.caching:w:1468,perf.scripts:p:378,perf.lcp:p:1118,perf.cls:p:1321,seo.title:w:717,seo.description:p:399,seo.canonical:p:1132,seo.og:p:1315,seo.indexable:p:728'), '27 of 32 checks passed on Chrome · Desktop. 5 issues found. Performance needs the most attention. All checks in this run are simulated demo output. (Sample run — demo data.)', 5, 0, 'simulated', true, now() - interval '2 hours', now() - interval '2 hours' + interval '14 seconds'),
(NULL, NULL, 'https://fernleaf-cafe.lovable.app/', 'responsive', 'webkit', 'mobile', NULL, 'failed', 75, 6023, public._seed_checks('smoke.reachable:f:639,smoke.https:p:1322,smoke.title:p:547,smoke.charset:p:745,smoke.favicon:p:1092,smoke.headers:p:321,smoke.console:f:687,smoke.links:p:324,resp.viewport:p:1150,resp.zoom:p:1340,resp.overflow:p:313,resp.tap:p:506,resp.fixed:p:398'), '11 of 13 checks passed on Safari · Mobile. 2 issues found, 1 critical. Fix first: Page responds successfully — Page returned HTTP 500. All checks in this run are simulated demo output. (Sample run — demo data.)', 2, 1, 'simulated', true, now() - interval '3 hours', now() - interval '3 hours' + interval '6 seconds'),
(NULL, 'a1000000-0000-4000-8000-000000000002', 'https://northwind-goods.lovable.app/checkout', 'accessibility', 'firefox', 'desktop', 'Complete checkout with keyboard only', 'warning', 81, 9503, public._seed_checks('smoke.reachable:p:862,smoke.https:p:861,smoke.title:p:1380,smoke.charset:p:785,smoke.favicon:p:1201,smoke.headers:p:1436,smoke.console:p:1472,smoke.links:p:1110,a11y.lang:p:1173,a11y.alt:f:133,a11y.labels:p:1505,a11y.buttons:p:1348,a11y.h1:p:870,a11y.contrast:f:586,a11y.focus:p:507') || '[{"id":"ai.custom","name":"Custom instruction: “Complete checkout with keyboard only”","category":"accessibility","severity":"medium","status":"pass","message":"AI reviewer followed the instruction and found no problems (simulated).","source":"simulated","durationMs":1888}]'::jsonb, '14 of 16 checks passed on Firefox · Desktop. 2 issues found. Fix first: Images have alt text — 4 of 11 images are missing alt text. All checks in this run are simulated demo output. (Sample run — demo data.)', 2, 0, 'simulated', true, now() - interval '9 hours', now() - interval '9 hours' + interval '10 seconds'),
(NULL, 'a1000000-0000-4000-8000-000000000003', 'https://pulse-fitness.lovable.app/', 'responsive', 'webkit', 'mobile', NULL, 'failed', 62, 7613, public._seed_checks('smoke.reachable:p:803,smoke.https:p:427,smoke.title:p:340,smoke.charset:p:1505,smoke.favicon:p:1320,smoke.headers:p:1154,smoke.console:f:653,smoke.links:p:1425,resp.viewport:f:944,resp.zoom:p:1314,resp.overflow:f:1016,resp.tap:w:1282,resp.fixed:p:734'), '9 of 13 checks passed on Safari · Mobile. 4 issues found, 1 critical. Fix first: Viewport meta tag — No viewport meta tag; mobile renders at 980px. Responsive needs the most attention. All checks in this run are simulated demo output. (Sample run — demo data.)', 4, 1, 'simulated', true, now() - interval '20 hours', now() - interval '20 hours' + interval '8 seconds'),
(NULL, 'a1000000-0000-4000-8000-000000000004', 'https://orbit-journal.lovable.app/blog', 'seo', 'chromium', 'desktop', NULL, 'passed', 95, 6811, public._seed_checks('smoke.reachable:p:1494,smoke.https:p:657,smoke.title:p:323,smoke.charset:p:1343,smoke.favicon:p:1397,smoke.headers:p:1390,smoke.console:w:454,smoke.links:p:234,seo.title:p:996,seo.description:p:302,seo.canonical:w:761,seo.og:w:867,seo.indexable:p:917'), '10 of 13 checks passed on Chrome · Desktop. 3 issues found. Smoke needs the most attention. All checks in this run are simulated demo output. (Sample run — demo data.)', 3, 0, 'simulated', true, now() - interval '30 hours', now() - interval '30 hours' + interval '7 seconds'),
(NULL, NULL, 'https://quill-legal.lovable.app/', 'performance', 'edge', 'laptop', NULL, 'warning', 83, 7695, public._seed_checks('smoke.reachable:p:617,smoke.https:p:660,smoke.title:p:794,smoke.charset:f:1381,smoke.favicon:p:770,smoke.headers:p:1492,smoke.console:p:527,smoke.links:w:1295,perf.ttfb:p:432,perf.size:f:1375,perf.compression:f:1161,perf.caching:p:1225,perf.scripts:p:748,perf.lcp:p:401,perf.cls:p:223'), '11 of 15 checks passed on Edge · Laptop. 4 issues found. Fix first: HTML payload size — HTML is 780 KB. Smoke needs the most attention. All checks in this run are simulated demo output. (Sample run — demo data.)', 4, 0, 'simulated', true, now() - interval '44 hours', now() - interval '44 hours' + interval '8 seconds'),
(NULL, NULL, 'https://fernleaf-cafe.lovable.app/menu', 'smoke', 'chromium', 'desktop', NULL, 'passed', 100, 4310, public._seed_checks('smoke.reachable:p:754,smoke.https:p:463,smoke.title:p:451,smoke.charset:p:346,smoke.favicon:p:1355,smoke.headers:p:1265,smoke.console:p:175,smoke.links:p:769'), '8 of 8 checks passed on Chrome · Desktop. No issues found — this page is in good shape. All checks in this run are simulated demo output. (Sample run — demo data.)', 0, 0, 'simulated', true, now() - interval '58 hours', now() - interval '58 hours' + interval '4 seconds'),
(NULL, NULL, 'https://atlas-travel.lovable.app/', 'comprehensive', 'chromium', 'tablet', 'Search for a trip to Lisbon and open the first result', 'warning', 85, 15980, public._seed_checks('smoke.reachable:p:335,smoke.https:p:694,smoke.title:p:460,smoke.charset:p:1213,smoke.favicon:p:259,smoke.headers:p:422,smoke.console:p:1357,smoke.links:p:714,a11y.lang:p:957,a11y.alt:p:1176,a11y.labels:p:684,a11y.buttons:p:582,a11y.h1:p:1178,a11y.contrast:p:359,a11y.focus:p:1484,resp.viewport:p:1467,resp.zoom:p:1345,resp.overflow:f:1495,resp.tap:f:415,resp.fixed:w:1367,perf.ttfb:p:993,perf.size:p:1454,perf.compression:p:1245,perf.caching:w:129,perf.scripts:p:566,perf.lcp:w:1247,perf.cls:w:1238,seo.title:p:856,seo.description:f:970,seo.canonical:p:493,seo.og:w:830,seo.indexable:p:584') || '[{"id":"ai.custom","name":"Custom instruction: “Search for a trip to Lisbon and open the first result”","category":"seo","severity":"medium","status":"pass","message":"AI reviewer followed the instruction and found no problems (simulated).","source":"simulated","durationMs":2942}]'::jsonb, '25 of 33 checks passed on Chrome · Tablet. 8 issues found. Fix first: No horizontal overflow (768 × 1024) — Pricing table overflows by 212px. Responsive needs the most attention. All checks in this run are simulated demo output. (Sample run — demo data.)', 8, 0, 'simulated', true, now() - interval '75 hours', now() - interval '75 hours' + interval '16 seconds'),
(NULL, NULL, 'https://northwind-goods.lovable.app/', 'smoke', 'firefox', 'desktop', NULL, 'passed', 99, 4066, public._seed_checks('smoke.reachable:p:160,smoke.https:p:431,smoke.title:p:481,smoke.charset:p:557,smoke.favicon:p:1190,smoke.headers:w:238,smoke.console:p:712,smoke.links:p:1266'), '7 of 8 checks passed on Firefox · Desktop. 1 issue found. All checks in this run are simulated demo output. (Sample run — demo data.)', 1, 0, 'simulated', true, now() - interval '120 hours', now() - interval '120 hours' + interval '4 seconds'),
(NULL, NULL, 'https://orbit-journal.lovable.app/', 'accessibility', 'chromium', 'mobile', NULL, 'failed', 59, 7010, public._seed_checks('smoke.reachable:f:226,smoke.https:p:159,smoke.title:p:231,smoke.charset:p:259,smoke.favicon:f:1186,smoke.headers:p:982,smoke.console:p:1375,smoke.links:p:1462,a11y.lang:p:319,a11y.alt:f:354,a11y.labels:p:1307,a11y.buttons:p:1073,a11y.h1:p:344,a11y.contrast:f:1379,a11y.focus:p:921'), '11 of 15 checks passed on Chrome · Mobile. 4 issues found, 1 critical. Fix first: Page responds successfully — Page returned HTTP 500. Smoke needs the most attention. All checks in this run are simulated demo output. (Sample run — demo data.)', 4, 1, 'simulated', true, now() - interval '150 hours', now() - interval '150 hours' + interval '7 seconds'),
(NULL, NULL, 'https://atlas-travel.lovable.app/', 'performance', 'chromium', 'mobile', NULL, 'warning', 88, 7601, public._seed_checks('smoke.reachable:p:539,smoke.https:p:194,smoke.title:p:1451,smoke.charset:p:1291,smoke.favicon:f:410,smoke.headers:p:1391,smoke.console:p:478,smoke.links:w:1168,perf.ttfb:w:766,perf.size:p:603,perf.compression:p:831,perf.caching:p:1180,perf.scripts:p:222,perf.lcp:p:957,perf.cls:p:1410'), '12 of 15 checks passed on Chrome · Mobile. 3 issues found. Fix first: Favicon present — No favicon declared. Smoke needs the most attention. All checks in this run are simulated demo output. (Sample run — demo data.)', 3, 0, 'simulated', true, now() - interval '215 hours', now() - interval '215 hours' + interval '8 seconds'),
(NULL, 'a1000000-0000-4000-8000-000000000001', 'https://fernleaf-cafe.lovable.app/', 'smoke', 'chromium', 'desktop', NULL, 'passed', 100, 5059, public._seed_checks('smoke.reachable:p:1483,smoke.https:p:386,smoke.title:p:1487,smoke.charset:p:299,smoke.favicon:p:1497,smoke.headers:p:604,smoke.console:p:431,smoke.links:p:1055'), '8 of 8 checks passed on Chrome · Desktop. No issues found — this page is in good shape. All checks in this run are simulated demo output. (Sample run — demo data.)', 0, 0, 'simulated', true, now() - interval '250 hours', now() - interval '250 hours' + interval '5 seconds'),
(NULL, 'a1000000-0000-4000-8000-000000000002', 'https://northwind-goods.lovable.app/checkout', 'accessibility', 'chromium', 'desktop', NULL, 'warning', 89, 8067, public._seed_checks('smoke.reachable:p:548,smoke.https:p:1314,smoke.title:p:1195,smoke.charset:p:589,smoke.favicon:p:966,smoke.headers:p:1169,smoke.console:p:187,smoke.links:p:829,a11y.lang:p:1510,a11y.alt:p:1213,a11y.labels:p:1007,a11y.buttons:p:969,a11y.h1:w:844,a11y.contrast:f:1018,a11y.focus:p:569'), '13 of 15 checks passed on Chrome · Desktop. 2 issues found. Fix first: Text contrast meets WCAG AA — Muted gray text on hero gradient measures 2.9:1. All checks in this run are simulated demo output. (Sample run — demo data.)', 2, 0, 'simulated', true, now() - interval '310 hours', now() - interval '310 hours' + interval '8 seconds');

DROP FUNCTION public._seed_checks(text);