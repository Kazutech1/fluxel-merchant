/**
 * Parsing for IP-allowlist entries. Merchants can type an IP, a CIDR range,
 * or a domain/URL; everything is stored as CIDR (`/32` or `/128` for single
 * addresses) so the list reads the same whatever was typed.
 */

export type AllowEntry =
  | { kind: 'ip'; input: string; cidr: string }
  | { kind: 'range'; input: string; cidr: string }
  | { kind: 'host'; input: string; host: string };

export function isIPv4(s: string): boolean {
  const parts = s.split('.');
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255 && (p === '0' || !p.startsWith('0')));
}

export function isIPv6(s: string): boolean {
  if (!s.includes(':') || !/^[0-9a-fA-F:.]+$/.test(s)) return false;
  try {
    // The URL parser validates (and normalises) bracketed IPv6 literals.
    new URL(`http://[${s}]/`);
    return true;
  } catch {
    return false;
  }
}

/** A hostname a person would type: labels of letters, digits and hyphens, with a dot. */
function isHostname(s: string): boolean {
  return s.length <= 253 && /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(s);
}

/**
 * One typed entry → what it means, or an error message.
 * "102.89.34.17" → ip · "102.89.0.0/16" → range · "https://api.shop.ng/hook" → host "api.shop.ng"
 */
export function parseAllowEntry(raw: string): AllowEntry | { error: string } {
  const input = raw.trim();
  if (!input) return { error: 'Enter an IP address, a range or a domain.' };

  const slash = input.indexOf('/');
  if (slash > 0 && !input.includes('://')) {
    const [addr, bits] = [input.slice(0, slash), input.slice(slash + 1)];
    const n = Number(bits);
    if (isIPv4(addr) && /^\d{1,2}$/.test(bits) && n >= 0 && n <= 32) {
      return n === 32 ? { kind: 'ip', input, cidr: input } : { kind: 'range', input, cidr: input };
    }
    if (isIPv6(addr) && /^\d{1,3}$/.test(bits) && n >= 0 && n <= 128) {
      return n === 128 ? { kind: 'ip', input, cidr: input.toLowerCase() } : { kind: 'range', input, cidr: input.toLowerCase() };
    }
    if (isIPv4(addr) || isIPv6(addr)) return { error: `“${bits}” isn’t a valid range size.` };
  }

  const bare = input.replace(/^\[|\]$/g, '');
  if (isIPv4(bare)) return { kind: 'ip', input, cidr: `${bare}/32` };
  if (isIPv6(bare)) return { kind: 'ip', input, cidr: `${bare.toLowerCase()}/128` };

  // Domains and links: keep just the hostname.
  let host = input;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`).hostname;
  } catch {
    return { error: 'That doesn’t look like an IP address, a range or a domain.' };
  }
  host = host.replace(/\.$/, '').toLowerCase();
  if (isIPv4(host)) return { kind: 'ip', input, cidr: `${host}/32` };
  if (isHostname(host)) return { kind: 'host', input, host };
  return { error: 'That doesn’t look like an IP address, a range or a domain.' };
}
