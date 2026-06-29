import { describe, it, expect, vi, afterEach } from "vitest";
import * as api from "../src/web/api.js";

afterEach(() => vi.restoreAllMocks());

describe("web api client", () => {
  it("encodes file path in query", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("hi", { status: 200 }),
    );
    await api.getFile("/a b/SKILL.md");
    expect(spy.mock.calls[0][0]).toContain("path=%2Fa%20b%2FSKILL.md");
  });
});
