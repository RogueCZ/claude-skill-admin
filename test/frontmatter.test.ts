import { describe, it, expect } from "vitest";
import {
  splitFrontmatter, parseFrontmatter, validateFrontmatter, FrontmatterError,
} from "../src/server/frontmatter.js";

const doc = `---\nname: foo\ndescription: Bar baz\n---\n\n# Body here\n`;

describe("frontmatter", () => {
  it("splits data and body", () => {
    const { data, body } = splitFrontmatter(doc);
    expect(data).toEqual({ name: "foo", description: "Bar baz" });
    expect(body.trim()).toBe("# Body here");
  });
  it("returns null data when no frontmatter", () => {
    expect(splitFrontmatter("# just markdown").data).toBeNull();
  });
  it("reads name/description", () => {
    expect(parseFrontmatter(doc)).toEqual({ name: "foo", description: "Bar baz" });
  });
  it("throws on invalid yaml", () => {
    expect(() => validateFrontmatter("---\nname: : :\n---\n")).toThrow(FrontmatterError);
  });
  it("no-op when no block", () => {
    expect(() => validateFrontmatter("# md only")).not.toThrow();
  });
});
