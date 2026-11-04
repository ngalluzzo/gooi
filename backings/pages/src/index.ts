import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

// Agents choose the URLs this fetches, so it only reaches the public web.
// Every host, the first and each redirect's, is resolved and refused if any
// address is local, private, link-local or reserved. A DNS answer can still
// change between this check and the connection (rebinding); pinning the
// connection to the checked address would close that, and isn't done here.

export interface PagesOptions {
  readonly fetch?: typeof fetch;
  readonly lookup?: (host: string) => Promise<readonly { address: string }[]>;
  /** Largest body read, in bytes. Defaults to 2 MB. */
  readonly maxBytes?: number;
  /** Milliseconds for the whole fetch, redirects included. Defaults to 15 s. */
  readonly timeout?: number;
  readonly maxRedirects?: number;
}

export interface Page {
  /** The URL the page was read from, after redirects. */
  readonly url: string;
  readonly contentType: string;
  readonly text: string;
}

const TEXT = /^(text\/html|application\/xhtml\+xml|text\/plain|text\/markdown)\b/iu;

function v4(address: string): number[] | undefined {
  const parts = address.split(".").map(Number);
  return parts.length === 4 && parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 255) ? parts : undefined;
}

function privateV4([a, b, c]: number[]): boolean {
  return a === 0 || a === 10 || a === 127 || a! >= 224
    || (a === 100 && b! >= 64 && b! <= 127)       // shared address space
    || (a === 169 && b === 254)                   // link-local, cloud metadata
    || (a === 172 && b! >= 16 && b! <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2)) // IETF protocol assignments, TEST-NET-1
    || (a === 198 && (b === 18 || b === 19))      // benchmarking
    || (a === 198 && b === 51 && c === 100)       // TEST-NET-2
    || (a === 203 && b === 0 && c === 113);       // TEST-NET-3
}

/** The eight 16-bit groups of an IPv6 address. */
function groups(address: string): number[] | undefined {
  let text = address.toLowerCase().replace(/%.*$/u, "");
  const tail = text.match(/(\d+\.\d+\.\d+\.\d+)$/u);
  if (tail) {
    const parts = v4(tail[1]!);
    if (!parts) return undefined;
    text = text.slice(0, -tail[1]!.length) + `${((parts[0]! << 8) | parts[1]!).toString(16)}:${((parts[2]! << 8) | parts[3]!).toString(16)}`;
  }
  const [head, rest] = text.split("::");
  const left = head ? head.split(":") : [], right = rest ? rest.split(":") : [];
  const fill = text.includes("::") ? 8 - left.length - right.length : 0;
  const all = [...left, ...Array(fill).fill("0"), ...right].map((g) => parseInt(g, 16));
  return all.length === 8 && all.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? all : undefined;
}

/** True for any address a fetch for an agent must not reach. */
export function isPrivate(address: string): boolean {
  const four = v4(address);
  if (four) return privateV4(four);
  const g = groups(address);
  if (!g) return true;
  if (g.every((x) => x === 0) || (g.slice(0, 7).every((x) => x === 0) && g[7] === 1)) return true; // :: and ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) // IPv4-mapped
    return privateV4([g[6]! >> 8, g[6]! & 0xff, g[7]! >> 8, g[7]! & 0xff]);
  if (g[0] === 0x64 && g[1] === 0xff9b) // NAT64
    return privateV4([g[6]! >> 8, g[6]! & 0xff, g[7]! >> 8, g[7]! & 0xff]);
  return (g[0]! & 0xfe00) === 0xfc00   // unique local
    || (g[0]! & 0xffc0) === 0xfe80     // link-local
    || (g[0]! & 0xff00) === 0xff00     // multicast
    || (g[0] === 0x2001 && g[1] === 0x0db8); // documentation
}

export function pages(options: PagesOptions = {}) {
  const request = options.fetch ?? fetch;
  const lookup = options.lookup ?? ((host: string) => dnsLookup(host, { all: true, verbatim: true }));
  const maxBytes = options.maxBytes ?? 2_000_000;
  const maxRedirects = options.maxRedirects ?? 5;

  async function check(url: URL) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`Only http and https pages can be read, not ${url.protocol}`);
    if (url.username || url.password) throw new Error("Page URLs can't carry a user name or password");
    const host = url.hostname.replace(/^\[|\]$/gu, "");
    const addresses = isIP(host) ? [host] : (await lookup(host).catch(() => [])).map((a) => a.address);
    if (!addresses.length) throw new Error(`${url.hostname} doesn't resolve`);
    if (addresses.some(isPrivate)) throw new Error(`${url.hostname} is a local or private address, which pages can't be read from`);
  }

  async function body(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error(`The page is larger than ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
    const charset = response.headers.get("content-type")?.match(/charset=([\w-]+)/iu)?.[1] ?? "utf-8";
    const decoder = (() => { try { return new TextDecoder(charset); } catch { return new TextDecoder(); } })();
    return decoder.decode(Buffer.concat(chunks));
  }

  return {
    async get(address: string): Promise<Page> {
      const signal = AbortSignal.timeout(options.timeout ?? 15000);
      let url: URL;
      try { url = new URL(address); } catch { throw new Error(`Not a URL: ${address}`); }
      for (let redirects = 0; ; redirects++) {
        await check(url);
        const response = await request(url, {
          redirect: "manual", signal,
          headers: { "User-Agent": "gooi", Accept: "text/html, text/plain;q=0.9, */*;q=0.1" },
        });
        if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
          if (redirects >= maxRedirects) throw new Error(`More than ${maxRedirects} redirects`);
          url = new URL(response.headers.get("location")!, url);
          continue;
        }
        if (!response.ok) throw new Error(`${url.host} answered ${response.status}`);
        const contentType = response.headers.get("content-type") ?? "";
        if (!TEXT.test(contentType)) throw new Error(`${url.host} sent ${contentType || "no content type"}, not a text page`);
        return { url: url.href, contentType: contentType.split(";")[0]!.trim().toLowerCase(), text: await body(response) };
      }
    },
  };
}

export type Pages = ReturnType<typeof pages>;
