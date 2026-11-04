import { expect, test } from "bun:test";
import { isPrivate, pages } from "./index.js";

test("local, private, link-local and reserved addresses are private, in both families", () => {
  for (const address of [
    "127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "192.0.2.1", "198.51.100.1", "203.0.113.1", "198.18.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a9fe:a9fe", "2001:db8::1", "not-an-ip",
  ]) expect(isPrivate(address), address).toBe(true);
  for (const address of ["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8", "192.0.3.1", "198.51.1.1", "203.0.1.1"])
    expect(isPrivate(address), address).toBe(false);
});

const html = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", ...headers } });

function web(routes: Record<string, () => Response>, dns: Record<string, string[]> = {}) {
  const seen: string[] = [];
  const reader = pages({
    maxBytes: 64,
    lookup: async (host) => (dns[host] ?? ["93.184.216.34"]).map((address) => ({ address })),
    fetch: (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      const route = routes[String(input)];
      if (!route) throw new Error(`unexpected request ${input}`);
      return route();
    }) as unknown as typeof fetch,
  });
  return { reader, seen };
}

test("a public page is read as text, following a relative redirect", async () => {
  const { reader, seen } = web({
    "https://example.com/a": () => new Response(null, { status: 301, headers: { location: "/b" } }),
    "https://example.com/b": () => html("<title>B</title><p>hi</p>"),
  });
  expect(await reader.get("https://example.com/a")).toEqual({ url: "https://example.com/b", contentType: "text/html", text: "<title>B</title><p>hi</p>" });
  expect(seen).toEqual(["https://example.com/a", "https://example.com/b"]);
});

test("local and private hosts are refused before any request, including through a redirect or DNS", async () => {
  const { reader, seen } = web({
    "https://example.com/hop": () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }),
  }, { "internal.test": ["10.0.0.5"], "sneaky.test": ["93.184.216.34", "::1"] });
  for (const url of ["http://127.0.0.1:8888/search", "http://[::1]/", "http://internal.test/", "http://sneaky.test/", "https://example.com/hop"])
    await expect(reader.get(url), url).rejects.toThrow("is a local or private address");
  expect(seen).toEqual(["https://example.com/hop"]);
  await expect(reader.get("file:///etc/passwd")).rejects.toThrow("Only http and https pages can be read, not file:");
  await expect(reader.get("https://user:pw@example.com/")).rejects.toThrow("can't carry a user name or password");
});

test("pages that are too big, not text, failing or redirecting forever are refused", async () => {
  const { reader } = web({
    "https://example.com/big": () => html("x".repeat(100)),
    "https://example.com/pdf": () => new Response("%PDF", { headers: { "content-type": "application/pdf" } }),
    "https://example.com/gone": () => new Response("", { status: 404 }),
    "https://example.com/loop": () => new Response(null, { status: 302, headers: { location: "/loop" } }),
  });
  await expect(reader.get("https://example.com/big")).rejects.toThrow("The page is larger than 64 bytes");
  await expect(reader.get("https://example.com/pdf")).rejects.toThrow("example.com sent application/pdf, not a text page");
  await expect(reader.get("https://example.com/gone")).rejects.toThrow("example.com answered 404");
  await expect(reader.get("https://example.com/loop")).rejects.toThrow("More than 5 redirects");
});
