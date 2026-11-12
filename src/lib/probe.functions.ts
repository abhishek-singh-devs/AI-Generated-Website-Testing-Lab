import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateUrl, isPrivateHost } from "@/lib/testing/url";
import { inspectHtml } from "@/lib/testing/parse-html";
import type { ProbeResult } from "@/lib/testing/types";

const MAX_BYTES = 2_000_000;

/**
 * Fetches the target page once from the server and extracts facts the check engine can measure
 * (status, timing, headers, HTML metadata). It does NOT render JavaScript or take screenshots —
 * those checks stay simulated unless a real browser service is configured.
 */
export const probeSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().min(1).max(2048) }).parse(input))
  .handler(async ({ data }): Promise<ProbeResult> => {
    const v = validateUrl(data.url);
    if (!v.ok) return { reachable: false, error: v.error };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const started = Date.now();
    try {
      const res = await fetch(v.url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; AIWebsiteTestingLab/1.0; +https://lovable.dev)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      const responseMs = Date.now() - started;
      const finalUrl = res.url || v.url;
      try {
        if (isPrivateHost(new URL(finalUrl).hostname)) {
          return { reachable: false, error: "Redirected to a private address" };
        }
      } catch {
        /* ignore malformed final URL */
      }

      const contentType = res.headers.get("content-type") ?? "";
      const reader = res.body?.getReader();
      let bytes = 0;
      const chunks: Uint8Array[] = [];
      if (reader) {
        while (bytes < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          bytes += value.byteLength;
        }
        await reader.cancel().catch(() => {});
      }
      const buf = new Uint8Array(bytes);
      let off = 0;
      for (const c of chunks) {
        buf.set(c.subarray(0, Math.min(c.byteLength, bytes - off)), off);
        off += c.byteLength;
      }
      const body = /html|xml|text/i.test(contentType) || !contentType ? new TextDecoder().decode(buf) : "";

      const encoding = res.headers.get("content-encoding");
      return {
        reachable: true,
        finalUrl,
        status: res.status,
        responseMs,
        bytes,
        https: finalUrl.startsWith("https://"),
        contentType,
        // Runtimes may transparently decompress and drop the header; treat unknown as compressed=undefined.
        compressed: encoding ? /br|gzip|deflate|zstd/i.test(encoding) : undefined,
        headers: {
          hsts: res.headers.has("strict-transport-security"),
          csp: res.headers.has("content-security-policy"),
          xFrameOptions:
            res.headers.has("x-frame-options") || /frame-ancestors/i.test(res.headers.get("content-security-policy") ?? ""),
          cacheControl: res.headers.get("cache-control") ?? undefined,
        },
        html: body ? inspectHtml(body) : undefined,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      console.error("probeSite failed", v.host, err);
      return { reachable: false, error: aborted ? "Timed out after 10 seconds" : "Could not connect to the site" };
    } finally {
      clearTimeout(timer);
    }
  });