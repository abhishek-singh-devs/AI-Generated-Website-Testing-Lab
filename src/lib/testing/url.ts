export type UrlValidation = { ok: true; url: string; host: string } | { ok: false; error: string };

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) {
    return h.includes(":");
  }
  return PRIVATE_V4.some((re) => re.test(h));
}

/** Validate and normalise a user-entered website URL. Bare domains get https:// added. */
export function validateUrl(input: string): UrlValidation {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Enter a website URL to test." };
  if (raw.length > 2048) return { ok: false, error: "That URL is too long (max 2048 characters)." };

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  if (!hasScheme && /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^:]+:\d+/.test(raw)) {
    return { ok: false, error: "Only http and https URLs can be tested." };
  }
  let parsed: URL;
  try {
    parsed = new URL(hasScheme ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs can be tested." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Remove credentials from the URL before testing." };
  }
  const host = parsed.hostname;
  if (isPrivateHost(host)) {
    return { ok: false, error: "Local and private network addresses can't be reached by the lab." };
  }
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (!isIpv4 && !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(host)) {
    return { ok: false, error: "Include a full domain, like example.com." };
  }
  return { ok: true, url: parsed.toString(), host };
}

export function displayHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}