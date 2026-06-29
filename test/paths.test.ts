import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveInRoot, encodeId, decodeId, isExcludedPath, PathError,
} from "../src/server/paths.js";

function tmpRoot() {
  const dir = mkdtempSync(join(tmpdir(), "sa-"));
  mkdirSync(join(dir, "skills", "foo"), { recursive: true });
  writeFileSync(join(dir, "skills", "foo", "SKILL.md"), "x");
  return { label: "t", path: dir };
}

describe("paths", () => {
  it("accepts a path inside a root", () => {
    const r = tmpRoot();
    const p = join(r.path, "skills", "foo", "SKILL.md");
    expect(resolveInRoot([r], p)).toBe(p);
  });
  it("rejects traversal outside root", () => {
    const r = tmpRoot();
    expect(() => resolveInRoot([r], join(r.path, "..", "..", "etc", "passwd")))
      .toThrow(PathError);
  });
  it("round-trips ids", () => {
    const id = encodeId("global", "skill", "my-skill");
    expect(decodeId(id)).toEqual({ rootLabel: "global", type: "skill", name: "my-skill" });
  });
  it("rejects malformed id", () => {
    expect(() => decodeId("!!!notbase64!!!")).toThrow(PathError);
  });
  it("flags excluded paths", () => {
    expect(isExcludedPath("plugins/cache/x")).toBe(true);
    expect(isExcludedPath(".skill-admin-trash/y")).toBe(true);
    expect(isExcludedPath("skills/foo")).toBe(false);
  });
});
