import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import { createServer } from "../src/server/server.js";

describe("createServer – static containment", () => {
  it("traversal attempt does not serve files outside publicDir", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sa-srv-"));
    writeFileSync(join(dir, "index.html"), "INDEX");

    const server = createServer([], dir);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as { port: number };

    try {
      // URL parser normalises /../../etc/passwd → /etc/passwd; after join this resolves
      // inside publicDir → SPA fallback (200 with "INDEX"). If the containment check
      // fires first, we get 403. Either way, no file outside publicDir is served.
      const res = await fetch(`http://127.0.0.1:${addr.port}/../../etc/passwd`);
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(await res.text()).toBe("INDEX");
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

// FIX 5 — Host-header guard
describe("createServer – Host-header guard", () => {
  function makeRequest(port: number, hostHeader: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/roots",
          method: "GET",
          headers: { host: hostHeader },
        },
        (res) => resolve(res.statusCode ?? 0),
      );
      req.on("error", reject);
      req.end();
    });
  }

  it("rejects a request with Host: evil.com with 403", async () => {
    const server = createServer([], undefined);
    await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
    const { port } = server.address() as { port: number };
    try {
      const status = await makeRequest(port, "evil.com");
      expect(status).toBe(403);
    } finally {
      await new Promise<void>((res) => server.close(() => res()));
    }
  });

  it("allows a request with Host: 127.0.0.1:<port>", async () => {
    const server = createServer([], undefined);
    await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
    const { port } = server.address() as { port: number };
    try {
      const status = await makeRequest(port, `127.0.0.1:${port}`);
      // /api/roots is valid (returns 200) — not 403
      expect(status).toBe(200);
    } finally {
      await new Promise<void>((res) => server.close(() => res()));
    }
  });

  it("allows a request with Host: localhost:<port>", async () => {
    const server = createServer([], undefined);
    await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
    const { port } = server.address() as { port: number };
    try {
      const status = await makeRequest(port, `localhost:${port}`);
      expect(status).toBe(200);
    } finally {
      await new Promise<void>((res) => server.close(() => res()));
    }
  });
});
