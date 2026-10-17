const BASE = "http://evencost.invalid";

/**
 * The only valid post-auth destination is a path on this origin. Resolving
 * against a fixed base catches what string checks miss: a tab or newline is
 * stripped by the URL parser, and `"/..//evil.com"` normalises to a
 * protocol-relative path. Both would leave the site.
 */
export function safeRedirectPath(value: string, fallback = "/dashboard"): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    if (url.pathname.startsWith("//")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
