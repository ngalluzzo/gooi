import { describe, expect, test } from "bun:test";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import { HAST, printHtml } from "./index.js";

describe("printHtml", () => {
  test("the printer refuses trees whose HTML would mean something else", async () => {
    const el = (tagName: string, properties: object, children: object[]) => ({
      type: "element",
      tagName,
      properties,
      children,
    });
    for (const child of [
      { type: "raw", value: "<script>evil()</script>" },
      el("img src=x onerror=evil()", {}, []),
      el("p", { 'title="x" onclick="evil()"': "y" }, []),
      el("style", {}, [{ type: "text", value: "</style><script>evil()</script>" }]),
    ])
      await expect(
        invoke(printHtml, artifact(HAST, { type: "root", children: [child] })),
      ).rejects.toThrow("doesn't parse back to the same tree");
  });
});
