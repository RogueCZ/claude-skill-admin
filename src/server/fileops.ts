import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync,
  renameSync, copyFileSync, rmSync,
} from "node:fs";
import { join, relative, dirname, basename, sep } from "node:path";
import type { Root, ItemType } from "./config.js";
import { resolveInRoot, decodeId, encodeId, symlinkSkillRoots } from "./paths.js";
import { validateFrontmatter } from "./frontmatter.js";

export class FileOpError extends Error {}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

const BACKUP_DIR = ".skill-admin-backups";
const TRASH_DIR = ".skill-admin-trash";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function rootForPath(roots: Root[], real: string): Root {
  // Sort by descending resolved-path length so the most-specific (longest) root matches first,
  // preventing a parent root from stealing paths that belong to a nested child root.
  const sorted = [...roots].sort(
    (a, b) => resolveInRoot(roots, b.path).length - resolveInRoot(roots, a.path).length,
  );
  for (const r of sorted) {
    const resolvedRoot = resolveInRoot(roots, r.path);
    const rel = relative(resolvedRoot, real);
    if (rel === "" || (!rel.startsWith("..") && rel !== real)) return r;
  }
  // Fall back: segment-boundary prefix check (avoids /tmp/work matching /tmp/work-extra/...).
  const r = sorted.find((x) => {
    const resolvedRoot = resolveInRoot(roots, x.path);
    return real === resolvedRoot || real.startsWith(resolvedRoot + sep);
  });
  if (r) return r;

  // Final fallback: real path is inside a symlinked skill target outside all roots.
  for (const { base, root } of symlinkSkillRoots(roots)) {
    if (real === base || real.startsWith(base + sep)) return root;
  }

  throw new FileOpError(`No root for ${real}`);
}

export function itemPath(
  roots: Root[],
  id: string,
): { root: Root; type: ItemType; path: string } {
  const { rootLabel, type, name } = decodeId(id);
  const root = roots.find((r) => r.label === rootLabel);
  if (!root) throw new FileOpError(`Unknown root: ${rootLabel}`);
  const path =
    type === "skill"
      ? join(root.path, "skills", name)
      : join(root.path, "commands", `${name}.md`);
  resolveInRoot(roots, path);
  return { root, type, path };
}

export function readFile(roots: Root[], path: string): string {
  const real = resolveInRoot(roots, path);
  return readFileSync(real, "utf8");
}

export function writeFile(roots: Root[], path: string, content: string): void {
  const real = resolveInRoot(roots, path);
  validateFrontmatter(content);
  if (existsSync(real)) backup(roots, real);
  mkdirSync(dirname(real), { recursive: true });
  writeFileSync(real, content, "utf8");
}

function backup(roots: Root[], real: string): void {
  const root = rootForPath(roots, real);
  const resolvedRoot = resolveInRoot(roots, root.path);
  const rel = relative(resolvedRoot, real);
  // If the real path is a symlinked-skill target outside the root, rel will
  // start with "..". Use a safe two-component name to keep the backup inside
  // the owning root's backup dir.
  const safePath = rel.startsWith("..") ? join(basename(dirname(real)), basename(real)) : rel;
  const dest = join(resolvedRoot, BACKUP_DIR, `${safePath}.${timestamp()}`);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(real, dest);
}

export function createItem(
  roots: Root[],
  type: ItemType,
  rootLabel: string,
  name: string,
): { id: string; path: string } {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new FileOpError(`Invalid name: ${name}`);
  }
  const root = roots.find((r) => r.label === rootLabel);
  if (!root) throw new FileOpError(`Unknown root: ${rootLabel}`);

  if (type === "skill") {
    const dir = join(root.path, "skills", name);
    resolveInRoot(roots, dir);
    if (existsSync(dir)) throw new FileOpError(`Skill exists: ${name}`);
    mkdirSync(dir, { recursive: true });
    const tmpl =
      `---\nname: ${name}\ndescription: TODO describe when to use this skill\n---\n\n` +
      `# ${name}\n\nDescribe the skill here.\n`;
    writeFileSync(join(dir, "SKILL.md"), tmpl, "utf8");
    return { id: encodeId(rootLabel, type, name), path: dir };
  }

  const dir = join(root.path, "commands");
  const file = join(dir, `${name}.md`);
  resolveInRoot(roots, file);
  if (existsSync(file)) throw new FileOpError(`Command exists: ${name}`);
  mkdirSync(dir, { recursive: true });
  const tmpl = `---\ndescription: TODO describe this command\n---\n\n# ${name}\n`;
  writeFileSync(file, tmpl, "utf8");
  return { id: encodeId(rootLabel, type, name), path: file };
}

export function addFile(
  roots: Root[],
  id: string,
  relName: string,
  content: string,
): string {
  if (relName.includes("..")) throw new FileOpError(`Bad file name: ${relName}`);
  const { type, path: itemDir } = itemPath(roots, id);
  if (type !== "skill") throw new FileOpError("Can only add files to skills");
  const dest = join(itemDir, relName);
  const real = resolveInRoot(roots, dest);
  if (existsSync(real)) throw new FileOpError(`File exists: ${relName}`);
  mkdirSync(dirname(real), { recursive: true });
  writeFileSync(real, content, "utf8");
  return real;
}

export function listFiles(roots: Root[], id: string): FileNode[] {
  const { type, path } = itemPath(roots, id);
  if (type === "command") {
    return [{ name: basename(path), path, type: "file" }];
  }
  resolveInRoot(roots, path);
  return walk(path);
}

function walk(dir: string): FileNode[] {
  const out: FileNode[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push({ name: e.name, path: p, type: "dir", children: walk(p) });
    } else {
      out.push({ name: e.name, path: p, type: "file" });
    }
  }
  out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  return out;
}

export function deleteToTrash(roots: Root[], path: string): void {
  const real = resolveInRoot(roots, path);
  if (!existsSync(real)) throw new FileOpError(`Not found: ${path}`);
  const root = rootForPath(roots, real);
  const resolvedRoot = resolveInRoot(roots, root.path);
  const rel = relative(resolvedRoot, real);
  if (rel.split(sep)[0] === TRASH_DIR) {
    rmSync(real, { recursive: true, force: true });
    return;
  }
  const dest = join(resolvedRoot, TRASH_DIR, `${rel}.${timestamp()}`);
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(real, dest);
}
