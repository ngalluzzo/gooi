import { describe, expect, test } from "bun:test";
import { finishText, nameFor, readName, readTask, taskText } from "./format.js";

describe("task files", () => {
  test("a new task reads back", () => {
    const text = taskText("Ship it", "2026-11-03", "Some notes.\n\nMore.");
    expect(text).toBe(
      "---\nstatus: open\ncreated: 2026-11-03\n---\n\n# Ship it\n\nSome notes.\n\nMore.\n",
    );
    expect(readTask("ship-it", text)).toEqual({
      name: "ship-it",
      title: "Ship it",
      status: "open",
      created: "2026-11-03",
    });
  });

  test("finishing changes only the header", () => {
    const body =
      "# Ship it\n\n  Notes with --- and trailing spaces  \n\n- [ ] sub item\n";
    const text = `---\nstatus:   open\ntags: gooi\ncreated: 2026-11-01\n---\n${body}`;
    const done = finishText("ship-it", text, "2026-11-03");
    expect(done).toBe(
      `---\nstatus: done\ntags: gooi\ncreated: 2026-11-01\nfinished: 2026-11-03\n---\n${body}`,
    );
    expect(readTask("ship-it", done)).toMatchObject({
      status: "done",
      finished: "2026-11-03",
    });
    expect(() => finishText("ship-it", done, "2026-11-04")).toThrow(
      "already done",
    );
  });

  test("refuses files it cannot read instead of guessing", () => {
    const ok = "---\nstatus: open\ncreated: 2026-11-03\n---\n# T\n";
    for (const [text, problem] of [
      [ok.replaceAll("\n", "\r\n"), "Unix line endings"],
      ["# T\n", "start with a --- header"],
      ["---\nstatus: open\ncreated: 2026-11-03\n# T\n", "end with ---"],
      [
        "---\nstatus open\ncreated: 2026-11-03\n---\n# T\n",
        "Unreadable header line 2",
      ],
      [
        "---\nstatus: open\nstatus: done\ncreated: 2026-11-03\n---\n# T\n",
        "Repeated header key",
      ],
      [
        "---\nstatus: maybe\ncreated: 2026-11-03\n---\n# T\n",
        "status: open or status: done",
      ],
      [
        "---\nstatus: open\ncreated: yesterday\n---\n# T\n",
        "created: YYYY-MM-DD",
      ],
      ["---\nstatus: open\ncreated: 2026-11-03\n---\nNo heading\n", "# title"],
    ] as const)
      expect(() => readTask("t", text)).toThrow(problem);
    expect(() => readTask("Bad Name", ok)).toThrow("lowercase words");
  });

  test("names come from titles", () => {
    expect(nameFor("Give edges input schemas for MCP!")).toBe(
      "give-edges-input-schemas-for-mcp",
    );
    expect(nameFor("  Café — déjà vu  ")).toBe("cafe-deja-vu");
    expect(nameFor("🎉")).toBe("");
    expect(nameFor("a".repeat(59) + " bcd")).toBe("a".repeat(59));
    expect(readName(nameFor("x".repeat(100)))).toHaveLength(60);
    expect(() => readName("../escape")).toThrow();
  });
});
