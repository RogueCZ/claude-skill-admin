import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveInRoot, encodeId, decodeId, PathError,
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

  // FIX 1 — symlinked skill tests
  it("accepts a file inside a symlinked skill whose target is outside the root", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "sa-sym-root-"));
    const outside = mkdtempSync(join(tmpdir(), "sa-sym-outside-"));
    writeFileSync(join(outside, "SKILL.md"), "---\nname: ext\n---\n");
    mkdirSync(join(rootDir, "skills"), { recursive: true });
    symlinkSync(outside, join(rootDir, "skills", "linked"));

    const r = { label: "t", path: rootDir };
    const p = join(rootDir, "skills", "linked", "SKILL.md");
    // Must NOT throw
    const resolved = resolveInRoot([r], p);
    expect(typeof resolved).toBe("string");
    // Resolved path should point into the outside dir (symlink followed)
    expect(resolved).toContain(outside);
  });

  it("rejects a traversal that escapes the root even via .. path", () => {
    const r = tmpRoot();
    expect(() => resolveInRoot([r], join(r.path, "..", "..", "etc", "passwd")))
      .toThrow(PathError);
  });

  it("rejects an arbitrary path outside all roots and not via a skill symlink", () => {
    const r = tmpRoot();
    const outside = mkdtempSync(join(tmpdir(), "sa-unrelated-"));
    writeFileSync(join(outside, "file.md"), "x");
    expect(() => resolveInRoot([r], join(outside, "file.md"))).toThrow(PathError);
  });
});
