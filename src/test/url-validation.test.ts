import { describe, expect, it } from "vitest";
import { displayHost, isPrivateHost, validateUrl } from "@/lib/testing/url";

describe("URL validation", () => {
  it("requires a non-empty URL", () => {
    expect(validateUrl("  ")).toEqual({ ok: false, error: "Enter a website URL to test." });
  });

  it("normalizes bare domains to HTTPS", () => {
    expect(validateUrl(" example.com ").ok).toBe(true);
    const result = validateUrl("example.com");
    if (result.ok) {
      expect(result.url).toBe("https://example.com/");
      expect(result.host).toBe("example.com");
    }
  });

  it("accepts valid HTTP and HTTPS URLs with paths", () => {
    expect(validateUrl("http://example.com/path?q=1").ok).toBe(true);
    expect(validateUrl("https://sub.example.org/page").ok).toBe(true);
  });

  it("rejects unsupported protocols", () => {
    expect(validateUrl("ftp://example.com").ok).toBe(false);
    expect(validateUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    expect(validateUrl("https://user:pass@example.com").ok).toBe(false);
  });

  it("rejects local and private hosts", () => {
    for (const host of ["localhost", "service.local", "10.0.0.1", "127.0.0.1", "192.168.1.2", "172.16.0.1", "169.254.1.1", "::1"]) {
      expect(isPrivateHost(host)).toBe(true);
      expect(validateUrl(`http://${host}`).ok).toBe(false);
    }
  });

  it("rejects incomplete hostnames and overlong input", () => {
    expect(validateUrl("example").ok).toBe(false);
    expect(validateUrl("a".repeat(2049)).ok).toBe(false);
  });

  it("formats a host and path for display", () => {
    expect(displayHost("https://www.example.com/products")).toBe("example.com/products");
    expect(displayHost("not a URL")).toBe("not a URL");
  });
});
