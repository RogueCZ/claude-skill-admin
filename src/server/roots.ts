import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import type { AppConfig, Root } from "./config.js";

export const DEFAULT_PORT = 7842;

interface LoadOpts {
  cwd: string;
  home: string;
  configPath?: string;
  env?: Record<string, string | undefined>;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function loadConfig(opts: LoadOpts): AppConfig {
  const env = opts.env ?? {};
  const auto: Root[] = [];
  const globalClaude = join(opts.home, ".claude");
  const projClaude = join(opts.cwd, ".claude");
  if (isDir(globalClaude)) auto.push({ label: "global", path: resolve(globalClaude) });
  if (isDir(projClaude)) auto.push({ label: "project", path: resolve(projClaude) });

  let filePort: number | undefined;
  const fileRoots: Root[] = [];
  const cfgPath = opts.configPath ?? findConfigFile(opts);
  if (cfgPath && existsSync(cfgPath)) {
    const parsed = JSON.parse(readFileSync(cfgPath, "utf8")) as Partial<AppConfig>;
    if (typeof parsed.port === "number") filePort = parsed.port;
    for (const r of parsed.roots ?? []) {
      if (r && typeof r.label === "string" && typeof r.path === "string") {
        fileRoots.push({ label: r.label, path: resolve(r.path) });
      }
    }
  }

  // dedup by resolved path; config entry wins (replaces auto label).
  const byPath = new Map<string, Root>();
  for (const r of auto) byPath.set(r.path, r);
  for (const r of fileRoots) byPath.set(r.path, r);

  const envPort = env.PORT ? Number(env.PORT) : undefined;
  const port = envPort && !Number.isNaN(envPort) ? envPort : filePort ?? DEFAULT_PORT;

  return { port, roots: [...byPath.values()] };
}

function findConfigFile(opts: LoadOpts): string | undefined {
  const candidates = [
    join(opts.cwd, "skill-admin.config.json"),
    join(opts.home, ".config", "skill-admin", "skill-admin.config.json"),
  ];
  return candidates.find((p) => existsSync(p));
}
