import { URL } from "url";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
]);

function normalizeHostname(hostname: string): string {
  const lower = hostname.toLowerCase().replace(/\.$/, "");
  if (lower.startsWith("[") && lower.endsWith("]")) {
    return lower.slice(1, -1);
  }
  try {
    return new URL(`http://${lower}`).hostname.toLowerCase();
  } catch {
    return lower;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = hostname.match(ipv4);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
  if (h.startsWith("fe80:")) return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("::ffff:")) {
    const v4 = h.slice("::ffff:".length);
    return isPrivateIpv4(v4);
  }
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) return true;
  return false;
}

export function assertSafeDestination(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid destination URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http(s) destinations are allowed");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Destination URL must not include credentials");
  }
  const host = parsed.hostname;
  if (isBlockedHost(host)) {
    throw new Error("Destination host is not allowed");
  }
}

/** @internal Exported for unit tests. */
export function isDestinationHostBlocked(hostname: string): boolean {
  return isBlockedHost(hostname);
}
