import { parse } from "yaml";

export class FrontmatterError extends Error {}

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontmatter(text: string): {
  data: Record<string, unknown> | null;
  body: string;
} {
  const m = text.match(FM);
  if (!m) return { data: null, body: text };
  let data: unknown;
  try {
    data = parse(m[1]);
  } catch (e) {
    throw new FrontmatterError(`Invalid YAML frontmatter: ${(e as Error).message}`);
  }
  if (data === null || typeof data !== "object") {
    throw new FrontmatterError("Frontmatter must be a YAML mapping");
  }
  return { data: data as Record<string, unknown>, body: text.slice(m[0].length) };
}

export function parseFrontmatter(text: string): { name?: string; description?: string } {
  const { data } = splitFrontmatter(text);
  if (!data) return {};
  const out: { name?: string; description?: string } = {};
  if (typeof data.name === "string") out.name = data.name;
  if (typeof data.description === "string") out.description = data.description;
  return out;
}

export function validateFrontmatter(text: string): void {
  if (FM.test(text)) splitFrontmatter(text);
}
