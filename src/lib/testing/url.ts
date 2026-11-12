export type UrlValidation = { ok: true; url: string; host: string } | { ok: false; error: string };

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // shared address space (100.64.0.0/10)
  /^192\.0\.0\./, // IETF protocol assignments
  /^192\.0\.2\./, // documentation
  /^198\.(18|19)\./, // benchmarking
  /^198\.51\.100\./, // documentation
  /^203\.0\.113\./, // documentation
  /^(22[4-9]|23\d|24\d|25[0-5])\./, // multicast
  /^240\./, // reserved
];

export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  if (!h.includes(":")) return PRIVATE_V4.some((re) => re.test(h));
  if (h === "::" || h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe") || h.startsWith("ff")) {
    return true;
  }
  // IPv4-mapped IPv6 can otherwise bypass the IPv4 deny list (e.g. ::ffff:7f00:1).
  if (h.startsWith("::ffff:")) {
    const mapped = h.slice(7);
    if (mapped.includes(".")) return PRIVATE_V4.some((re) => re.test(mapped));
    const groups = mapped.split(":");
    if (groups.length === 2 && groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) {
      const high = Number.parseInt(groups[0] ?? "0", 16);
      const low = Number.parseInt(groups[1] ?? "0", 16);
      const ipv4 = [high >> 8, high & 255, low >> 8, low & 255].join(".");
      return PRIVATE_V4.some((re) => re.test(ipv4));
    }
  }
  return false;
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