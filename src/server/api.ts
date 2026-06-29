import type { Root } from "./config.js";
import { scanAll } from "./scan.js";
import {
  listFiles, readFile, writeFile, createItem, addFile, deleteToTrash, itemPath,
  FileOpError,
} from "./fileops.js";
import { PathError } from "./paths.js";
import { FrontmatterError } from "./frontmatter.js";

export interface ApiResult {
  status: number;
  json?: unknown;
  text?: string;
}

const ok = (json: unknown, status = 200): ApiResult => ({ status, json });
const err = (status: number, message: string): ApiResult => ({ status, json: { error: message } });

export function handleApi(roots: Root[], method: string, url: URL, body: string): ApiResult {
  try {
    const path = url.pathname;
    const seg = path.split("/").filter(Boolean); // ["api", ...]

    if (path === "/api/roots" && method === "GET") {
      return ok(roots.map((r) => ({ label: r.label, path: r.path })));
    }
    if (path === "/api/items" && method === "GET") {
      return ok(scanAll(roots));
    }
    if (path === "/api/items" && method === "POST") {
      const { type, rootLabel, name } = JSON.parse(body || "{}");
      if (type !== "skill" && type !== "command") return err(400, "bad type");
      return ok(createItem(roots, type, rootLabel, name), 201);
    }
    if (path === "/api/file" && method === "GET") {
      const p = url.searchParams.get("path");
      if (!p) return err(400, "missing path");
      return { status: 200, text: readFile(roots, p) };
    }
    if (path === "/api/file" && method === "PUT") {
      const p = url.searchParams.get("path");
      if (!p) return err(400, "missing path");
      writeFile(roots, p, body);
      return ok({ ok: true });
    }
    if (path === "/api/file" && method === "DELETE") {
      const p = url.searchParams.get("path");
      if (!p) return err(400, "missing path");
      deleteToTrash(roots, p);
      return ok({ ok: true });
    }
    // /api/items/:id/files  and  /api/items/:id
    if (seg[0] === "api" && seg[1] === "items" && seg[2]) {
      const id = decodeURIComponent(seg[2]);
      if (seg[3] === "files" && method === "GET") {
        return ok(listFiles(roots, id));
      }
      if (seg[3] === "files" && method === "POST") {
        const { relName, content } = JSON.parse(body || "{}");
        return ok({ path: addFile(roots, id, relName, content ?? "") }, 201);
      }
      if (!seg[3] && method === "DELETE") {
        deleteToTrash(roots, itemPath(roots, id).path);
        return ok({ ok: true });
      }
    }
    return err(404, "not found");
  } catch (e) {
    if (e instanceof PathError || e instanceof FrontmatterError || e instanceof FileOpError || e instanceof SyntaxError) {
      return err(400, e.message);
    }
    return err(500, (e as Error).message);
  }
}
