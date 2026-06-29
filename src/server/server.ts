import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, resolve, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Root } from "./config.js";
import { loadConfig } from "./roots.js";
import { handleApi } from "./api.js";

const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".map": "application/json", ".woff2": "font/woff2",
};

export function createServer(roots: Root[], publicDir?: string): http.Server {
  return http.createServer((req, res) => {
    // FIX 5 — Host-header guard (DNS-rebinding hardening).
    // Accept only 127.0.0.1 and localhost; reject anything else (e.g. evil.com).
    // Missing host (empty) is allowed — it can't be a DNS-rebinding vector.
    const rawHost = req.headers.host ?? "";
    const hostName = rawHost.includes(":") ? rawHost.split(":")[0] : rawHost;
    if (hostName !== "" && hostName !== "127.0.0.1" && hostName !== "localhost") {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const result = handleApi(roots, req.method ?? "GET", url, body);
        if (result.text !== undefined) {
          res.writeHead(result.status, { "content-type": "text/plain; charset=utf-8" });
          res.end(result.text);
        } else {
          res.writeHead(result.status, { "content-type": "application/json" });
          res.end(JSON.stringify(result.json ?? null));
        }
      });
      return;
    }
    if (!publicDir) {
      res.writeHead(404).end("Not found");
      return;
    }
    serveStatic(publicDir, url.pathname, res);
  });
}

function serveStatic(publicDir: string, pathname: string, res: http.ServerResponse): void {
  const base = resolve(publicDir);
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let file = resolve(join(publicDir, rel === "/" ? "index.html" : rel));
  // Explicit containment check — safety must not depend solely on normalize+join behavior
  if (file !== base && file !== join(base, "index.html") && !file.startsWith(base + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    file = join(base, "index.html"); // SPA fallback
  }
  if (!existsSync(file)) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}

export function main(): void {
  const cfg = loadConfig({ cwd: process.cwd(), home: process.env.HOME ?? "", env: process.env });
  const here = dirname(fileURLToPath(import.meta.url));
  const publicDir = join(here, "public");
  const server = createServer(cfg.roots, existsSync(publicDir) ? publicDir : undefined);
  server.listen(cfg.port, "127.0.0.1", () => {
    console.log(`skill-admin running at http://127.0.0.1:${cfg.port}`);
    console.log(`Managing roots: ${cfg.roots.map((r) => r.label).join(", ") || "(none found)"}`);
  });
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1]);
if (isEntry) main();
