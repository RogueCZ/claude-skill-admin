import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createItem, readFile, writeFile, listFiles, addFile, deleteToTrash, itemPath, FileOpError,
} from "../src/server/fileops.js";

function root() {
  const dir = mkdtempSync(join(tmpdir(), "sa-ops-"));
  return { label: "t", path: dir };
}

describe("fileops", () => {
  it("creates a skill scaffold with SKILL.md", () => {
    const r = root();
    const { id, path } = createItem([r], "skill", "t", "my-skill");
    expect(existsSync(join(path, "SKILL.md"))).toBe(true);
    expect(readFile([r], join(path, "SKILL.md"))).toContain("name: my-skill");
    expect(itemPath([r], id).path).toBe(path);
  });

  it("creates a command file", () => {
    const r = root();
    const { path } = createItem([r], "command", "t", "do-thing");
    expect(path.endsWith("commands/do-thing.md") || path.endsWith("commands\\do-thing.md")).toBe(true);
    expect(existsSync(path)).toBe(true);
  });

  it("refuses to create an existing item", () => {
    const r = root();
    createItem([r], "skill", "t", "dup");
    expect(() => createItem([r], "skill", "t", "dup")).toThrow(FileOpError);
  });

  it("writes with a backup of the previous content", () => {
    const r = root();
    const { path } = createItem([r], "command", "t", "c");
    writeFile([r], path, "v1");
    writeFile([r], path, "v2");
    expect(readFile([r], path)).toBe("v2");
    const backups = readdirSync(join(r.path, ".skill-admin-backups", "commands"));
    expect(backups.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects invalid frontmatter on write", () => {
    const r = root();
    const { path } = createItem([r], "command", "t", "bad");
    expect(() => writeFile([r], path, "---\na: : :\n---\n")).toThrow();
  });

  it("lists skill folder files and adds a file", () => {
    const r = root();
    const { id, path } = createItem([r], "skill", "t", "tree");
    addFile([r], id, "reference/notes.md", "hello");
    const tree = listFiles([r], id);
    const names = JSON.stringify(tree);
    expect(names).toContain("SKILL.md");
    expect(names).toContain("notes.md");
    expect(readFile([r], join(path, "reference", "notes.md"))).toBe("hello");
  });

  it("deletes a folder to trash", () => {
    const r = root();
    const { path } = createItem([r], "skill", "t", "gone");
    deleteToTrash([r], path);
    expect(existsSync(path)).toBe(false);
    expect(existsSync(join(r.path, ".skill-admin-trash"))).toBe(true);
  });

  it("createItem rejects traversal chars in name", () => {
    const r = root();
    expect(() => createItem([r], "skill", "t", "../evil")).toThrow(FileOpError);
  });

  it("addFile rejects traversal in relName", () => {
    const r = root();
    const { id } = createItem([r], "skill", "t", "safe-skill");
    expect(() => addFile([r], id, "../escape", "x")).toThrow(FileOpError);
  });

  it("backup lands in the most-specific (nested) root, not the parent root", () => {
    const parentDir = mkdtempSync(join(tmpdir(), "sa-nested-parent-"));
    const childDir = join(parentDir, "team");
    mkdirSync(childDir, { recursive: true });
    const parentRoot = { label: "parent", path: parentDir };
    const childRoot = { label: "child", path: childDir };
    // Parent listed first — without the sort fix this would bias toward parent.
    const roots = [parentRoot, childRoot];
    const { id } = createItem(roots, "skill", "child", "nested-skill");
    const { path } = itemPath(roots, id);
    const skillMd = join(path, "SKILL.md");
    // Writing over the existing file triggers a backup.
    writeFile(roots, skillMd, "---\nname: nested-skill\ndescription: test\n---\n\n# nested-skill\n");
    // Backup must be inside the child (more-specific) root, NOT the parent root.
    expect(existsSync(join(childDir, ".skill-admin-backups"))).toBe(true);
    expect(existsSync(join(parentDir, ".skill-admin-backups"))).toBe(false);
  });
});
