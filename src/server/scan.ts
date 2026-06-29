import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import type { Root, ItemType } from "./config.js";
import { parseFrontmatter } from "./frontmatter.js";
import { encodeId } from "./paths.js";

export interface Item {
  id: string;
  rootLabel: string;
  type: ItemType;
  name: string;
  description: string;
  path: string;
  isSymlink: boolean;
}

function safeRead(p: string): string {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

export function scanRoot(root: Root): Item[] {
  const items: Item[] = [];

  const skillsDir = join(root.path, "skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      // A skill is any dir (or symlink to one) containing SKILL.md.
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const dirPath = join(skillsDir, entry.name);
      const skillMd = join(dirPath, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const meta = parseFrontmatter(safeRead(skillMd));
      items.push({
        id: encodeId(root.label, "skill", entry.name),
        rootLabel: root.label,
        type: "skill",
        name: meta.name ?? entry.name,
        description: meta.description ?? "",
        path: dirPath,
        isSymlink: entry.isSymbolicLink(),
      });
    }
  }

  const cmdsDir = join(root.path, "commands");
  if (existsSync(cmdsDir)) {
    for (const entry of readdirSync(cmdsDir, { withFileTypes: true })) {
      if (!entry.name.endsWith(".md")) continue;
      const filePath = join(cmdsDir, entry.name);
      const name = basename(entry.name, ".md");
      const meta = parseFrontmatter(safeRead(filePath));
      items.push({
        id: encodeId(root.label, "command", name),
        rootLabel: root.label,
        type: "command",
        name,
        description: meta.description ?? "",
        path: filePath,
        isSymlink: entry.isSymbolicLink(),
      });
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export function scanAll(roots: Root[]): Item[] {
  return roots.flatMap(scanRoot);
}
