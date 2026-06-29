import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleApi } from "../src/server/api.js";

function roots() {
  return [{ label: "t", path: mkdtempSync(join(tmpdir(), "sa-api-")) }];
}
const U = (p: string) => new URL(`http://127.0.0.1${p}`);

describe("handleApi", () => {
  it("lists roots", () => {
    const res = handleApi(roots(), "GET", U("/api/roots"), "");
    expect(res.status).toBe(200);
    expect((res.json as any[])[0].label).toBe("t");
  });

  it("creates, reads, lists, and deletes a skill", () => {
    const r = roots();
    const created = handleApi(r, "POST", U("/api/items"),
      JSON.stringify({ type: "skill", rootLabel: "t", name: "demo" }));
    expect(created.status).toBe(201);
    const id = (created.json as any).id;

    const items = handleApi(r, "GET", U("/api/items"), "");
    expect((items.json as any[]).some((i) => i.name === "demo")).toBe(true);

    const files = handleApi(r, "GET", U(`/api/items/${id}/files`), "");
    expect(JSON.stringify(files.json)).toContain("SKILL.md");

    const del = handleApi(r, "DELETE", U(`/api/items/${id}`), "");
    expect(del.status).toBe(200);
  });

  it("rejects path outside roots", () => {
    const res = handleApi(roots(), "GET", U("/api/file?path=/etc/passwd"), "");
    expect(res.status).toBe(400);
  });

  it("404 for unknown route", () => {
    expect(handleApi(roots(), "GET", U("/api/nope"), "").status).toBe(404);
  });

  it("malformed JSON body returns 400", () => {
    const res = handleApi(roots(), "POST", U("/api/items"), "{not json");
    expect(res.status).toBe(400);
  });

  // FIX 4 — ENOENT should produce 404, not 500
  it("GET /api/file for a path inside a root but nonexistent returns 404", () => {
    const r = roots();
    const missingPath = join(r[0].path, "nonexistent-file.md");
    const url = new URL("http://127.0.0.1/api/file");
    url.searchParams.set("path", missingPath);
    const res = handleApi(r, "GET", url, "");
    expect(res.status).toBe(404);
  });
});
