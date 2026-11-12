import type { HtmlFacts } from "./types";

/** Lightweight regex-based HTML inspection. Runs on the server (no DOM available). */
export function inspectHtml(html: string): HtmlFacts {
  const head = html.slice(0, 200_000);
  const attr = (tag: string, name: string) => {
    const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    return m ? (m[2] ?? m[3] ?? m[4] ?? "") : undefined;
  };
  const tags = (name: string) => head.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
  const metas = tags("meta");
  const metaBy = (key: string, value: string) =>
    metas.find((t) => (attr(t, key) ?? "").toLowerCase() === value);
  const links = tags("link");
  const linkRel = (rel: string) => links.find((t) => (attr(t, "rel") ?? "").toLowerCase().split(/\s+/).includes(rel));

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decode(titleMatch[1] ?? "").trim() || undefined : undefined;
  const viewport = metaBy("name", "viewport");
  const desc = metaBy("name", "description");
  const robots = metaBy("name", "robots");
  const htmlTag = head.match(/<html\b[^>]*>/i)?.[0] ?? "";

  const imgs = tags("img");
  const inputs = tags("input").filter((t) => !/type\s*=\s*["']?(hidden|submit|button|reset|image)/i.test(t));
  const labelFors = new Set(
    (head.match(/<label\b[^>]*>/gi) ?? []).map((l) => attr(l, "for")).filter(Boolean) as string[],
  );
  const inputsWithoutLabel = inputs.filter((t) => {
    if (attr(t, "aria-label") || attr(t, "aria-labelledby") || attr(t, "title")) return false;
    const id = attr(t, "id");
    return !(id && labelFors.has(id));
  }).length;

  const buttons = head.match(/<button\b[^>]*>([\s\S]*?)<\/button>/gi) ?? [];
  const emptyButtons = buttons.filter((b) => {
    const open = b.match(/<button\b[^>]*>/i)?.[0] ?? "";
    if (attr(open, "aria-label") || attr(open, "aria-labelledby") || attr(open, "title")) return false;
    const inner = b.replace(/<button\b[^>]*>|<\/button>/gi, "");
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const hasAltImg = /<img[^>]+alt\s*=\s*["'][^"']+["']/i.test(inner);
    const hasSrOnly = /sr-only|visually-hidden/i.test(inner);
    return !text && !hasAltImg && !hasSrOnly;
  }).length;

  const fixedWidthElements = (head.match(/style\s*=\s*["'][^"']*\bwidth\s*:\s*(\d{3,})px/gi) ?? []).filter((s) => {
    const n = Number(s.match(/(\d{3,})px/)?.[1] ?? 0);
    return n > 600;
  }).length;

  return {
    title,
    metaDescription: desc ? decode(attr(desc, "content") ?? "").trim() || undefined : undefined,
    hasViewport: Boolean(viewport),
    viewportContent: viewport ? attr(viewport, "content") : undefined,
    lang: attr(htmlTag, "lang") || undefined,
    h1Count: (head.match(/<h1\b/gi) ?? []).length,
    imgCount: imgs.length,
    imgMissingAlt: imgs.filter((t) => attr(t, "alt") === undefined).length,
    canonical: linkRel("canonical") ? attr(linkRel("canonical")!, "href") : undefined,
    ogTitle: Boolean(metaBy("property", "og:title")),
    ogImage: Boolean(metaBy("property", "og:image")),
    noindex: robots ? /noindex/i.test(attr(robots, "content") ?? "") : false,
    linkCount: tags("a").length,
    scriptCount: tags("script").length,
    stylesheetCount: links.filter((t) => /stylesheet/i.test(attr(t, "rel") ?? "")).length,
    hasFavicon: Boolean(linkRel("icon") || linkRel("shortcut") || linkRel("apple-touch-icon")),
    hasCharset: metas.some((t) => attr(t, "charset") !== undefined || /charset=/i.test(attr(t, "content") ?? "")),
    inputsWithoutLabel,
    emptyButtons,
    fixedWidthElements,
  };
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ");
}