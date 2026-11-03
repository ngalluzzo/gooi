import { describe, expect, test } from "bun:test";
import { invoke } from "@gooi/exchange";
import { compose } from "@gooi/kernel/compose";
import { artifact } from "@gooi/kernel/evidence";
import { TASKS } from "./index.js";
import { HAST, printHtml, renderTasks } from "./page.js";

const listing = {
  open: [{ name: "evil", title: '<script>alert("x")</script> & </style>', status: "open", created: "2026-11-03" }],
  done: [{ name: "old", title: "Old one", status: "done", created: "2026-11-01", finished: "2026-11-02" }],
  unreadable: [{ name: "broken", problem: "Expected the file to start with a --- header" }],
};

describe("task page", () => {
  test("renders the listing as escaped text and composes both hops", async () => {
    const rendered = await invoke(renderTasks, artifact(TASKS, listing));
    const printed = await invoke(printHtml, rendered.artifact);
    const html = printed.artifact.value as string;
    expect(html).toStartWith("<!doctype html>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&#x3C;script>alert(\"x\")&#x3C;/script> &#x26; &#x3C;/style>");
    expect(html).toContain("1 open · 1 done");
    expect(html).toContain("finished 2026-11-02");
    expect(html).toContain("broken.md");
    expect(html).toContain('<meta http-equiv="refresh" content="5">');
    const [trace] = compose([rendered, printed]);
    expect(trace).toMatchObject({ verdict: "passed", missingStage: null });
  });

  test("an empty listing still renders", async () => {
    const rendered = await invoke(renderTasks, artifact(TASKS, { open: [], done: [], unreadable: [] }));
    const html = (await invoke(printHtml, rendered.artifact)).artifact.value as string;
    expect(html).toContain("Nothing open.");
    expect(html).not.toContain("Can't read");
  });

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
