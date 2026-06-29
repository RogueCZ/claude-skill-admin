import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, DEFAULT_PORT } from "../src/server/roots.js";

function scratch() {
  const base = mkdtempSync(join(tmpdir(), "sa-cfg-"));
  const home = join(base, "home");
  const cwd = join(base, "proj");
  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(cwd, ".claude"), { recursive: true });
  return { base, home, cwd };
}

describe("loadConfig", () => {
  it("auto-detects global and project roots", () => {
    const { home, cwd } = scratch();
    const cfg = loadConfig({ cwd, home });
    expect(cfg.port).toBe(DEFAULT_PORT);
    expect(cfg.roots.map((r) => r.label).sort()).toEqual(["global", "project"]);
  });
  it("merges extra roots from config file and honors port", () => {
    const { base, home, cwd } = scratch();
    const extra = join(base, "extra");
    mkdirSync(extra, { recursive: true });
    const configPath = join(base, "skill-admin.config.json");
    writeFileSync(configPath, JSON.stringify({ port: 9000, roots: [{ label: "x", path: extra }] }));
    const cfg = loadConfig({ cwd, home, configPath });
    expect(cfg.port).toBe(9000);
    expect(cfg.roots.find((r) => r.label === "x")?.path).toContain("extra");
  });
  it("env PORT overrides config port", () => {
    const { home, cwd } = scratch();
    const cfg = loadConfig({ cwd, home, env: { PORT: "1234" } });
    expect(cfg.port).toBe(1234);
  });
});
