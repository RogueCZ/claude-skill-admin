import { realpathSync, readdirSync } from "node:fs";
import { resolve, relative, isAbsolute, dirname, basename, join } from "node:path";
import type { Root, ItemType } from "./config.js";

export class PathError extends Error {}

function realpathSafe(p: string): string {
  // Resolve symlinks for the longest existing prefix so containment checks
  // work even for not-yet-created files.
  try {
    return realpathSync(p);
  } catch {
    const parent = dirname(p);
    if (parent === p) return p;
    // FIX 3: use basename(p) instead of p.slice(parent.length + 1) to avoid
    // off-by-one when parent is "/" (length 1, +1 drops first char of name).
    return resolve(realpathSafe(parent), basename(p));
  }
}

function within(rootReal: string, targetReal: string): boolean {
  const rel = relative(rootReal, targetReal);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * FIX 1 — for each root, find top-level skills/ entries that are symlinks
 * and return their resolved real target paths alongside the owning root.
 * Used both in resolveInRoot (guard) and fileops rootForPath (backup).
 */
export function symlinkSkillRoots(roots: Root[]): Array<{ base: string; root: Root }> {
  const result: Array<{ base: string; root: Root }> = [];
  for (const r of roots) {
    const skillsDir = join(resolve(r.path), "skills");
    try {
      for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) {
          const target = realpathSafe(join(skillsDir, entry.name));
          result.push({ base: target, root: r });
        }
      }
    } catch {
      // skillsDir doesn't exist or isn't readable — skip silently
    }
  }
  return result;
}

export function resolveInRoot(roots: Root[], targetPath: string): string {
  const targetReal = realpathSafe(resolve(targetPath));

  // (a) Check configured root dirs
  for (const r of roots) {
    const rootReal = realpathSafe(resolve(r.path));
    if (within(rootReal, targetReal)) return targetReal;
  }

  // (b) Check symlinked-skill target dirs (only top-level skills/ symlinks,
  //     not arbitrary nested or commands/ symlinks — surgical allowlist).
  for (const { base } of symlinkSkillRoots(roots)) {
    if (within(base, targetReal)) return targetReal;
  }

  throw new PathError(`Path outside managed roots: ${targetPath}`);
}

export function encodeId(rootLabel: string, type: ItemType, name: string): string {
  return Buffer.from(`${rootLabel}:${type}:${name}`, "utf8").toString("base64url");
}

export function decodeId(id: string): { rootLabel: string; type: ItemType; name: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(id, "base64url").toString("utf8");
  } catch {
    throw new PathError(`Malformed id: ${id}`);
  }
  const idx1 = decoded.indexOf(":");
  const idx2 = decoded.indexOf(":", idx1 + 1);
  if (idx1 < 0 || idx2 < 0) throw new PathError(`Malformed id: ${id}`);
  const rootLabel = decoded.slice(0, idx1);
  const type = decoded.slice(idx1 + 1, idx2);
  const name = decoded.slice(idx2 + 1);
  if (type !== "skill" && type !== "command") throw new PathError(`Bad id type: ${id}`);
  if (!rootLabel || !name) throw new PathError(`Malformed id: ${id}`);
  return { rootLabel, type, name };
}
