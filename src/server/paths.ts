import { realpathSync } from "node:fs";
import { resolve, relative, isAbsolute, sep, dirname } from "node:path";
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
    return resolve(realpathSafe(parent), p.slice(parent.length + 1));
  }
}

function within(rootReal: string, targetReal: string): boolean {
  const rel = relative(rootReal, targetReal);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveInRoot(roots: Root[], targetPath: string): string {
  const targetReal = realpathSafe(resolve(targetPath));
  for (const r of roots) {
    const rootReal = realpathSafe(resolve(r.path));
    if (within(rootReal, targetReal)) return targetReal;
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

const EXCLUDED = ["plugins/cache/", ".skill-admin-backups/", ".skill-admin-trash/"];

export function isExcludedPath(rel: string): boolean {
  const norm = rel.split(sep).join("/");
  return EXCLUDED.some((p) => norm === p.slice(0, -1) || norm.startsWith(p));
}
