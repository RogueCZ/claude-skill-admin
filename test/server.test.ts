import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
