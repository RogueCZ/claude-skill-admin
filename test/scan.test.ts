import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanRoot } from "../src/server/scan.js";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "sa-scan-"));
  mkdirSync(join(dir, "skills", "alpha"), { recursive: true });
  writeFileSync(join(dir, "skills", "alpha", "SKILL.md"),
    "---\nname: alpha\ndescription: Alpha skill\n---\nbody");
  mkdirSync(join(dir, "skills", "not-a-skill"), { recursive: true }); // no SKILL.md
  mkdirSync(join(dir, "commands"), { recursive: true });
  writeFileSync(join(dir, "commands", "hello.md"),
    "---\ndescription: Hello cmd\n---\nhi");
  mkdirSync(join(dir, "plugins", "cache", "p", "skills", "x"), { recursive: true });
  writeFileSync(join(dir, "plugins", "cache", "p", "skills", "x", "SKILL.md"), "x");
  return { label: "t", path: dir };
}

describe("scanRoot", () => {
  it("finds skills and commands, applies metadata", () => {
    const items = scanRoot(fixture());
    const skill = items.find((i) => i.type === "skill");
    const cmd = items.find((i) => i.type === "command");
    expect(skill).toMatchObject({ name: "alpha", description: "Alpha skill" });
    expect(cmd).toMatchObject({ name: "hello", description: "Hello cmd" });
  });
  it("ignores dirs without SKILL.md and plugin cache", () => {
    const items = scanRoot(fixture());
    expect(items.find((i) => i.name === "not-a-skill")).toBeUndefined();
    expect(items.find((i) => i.name === "x")).toBeUndefined();
  });
  it("flags symlinked skills", () => {
    const f = fixture();
    const target = join(f.path, "..", "ext-skill");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "SKILL.md"), "---\nname: linked\n---\n");
    symlinkSync(target, join(f.path, "skills", "linked"));
    const items = scanRoot(f);
    expect(items.find((i) => i.name === "linked")?.isSymlink).toBe(true);
  });
});
