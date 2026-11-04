import { describe, expect, test } from "bun:test";
import { invoke } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";
import {
  CLOSE,
  EMPTY,
  OPEN,
  STATUS,
  WAIT,
  readState,
  render,
  slices,
  type State,
  type Store,
} from "./index.js";

function memory(initial: State = EMPTY) {
  let state = initial,
    writes = 0;
  const store: Store = {
    read: () => state,
    write: (next) => {
      state = next;
      writes++;
    },
  };
  return { store, get: () => state, writes: () => writes };
}
const edges = (store: Store) => slices(store, () => "2026-11-03");
const open = (value: object) => artifact(OPEN, value);
const close = (used: string) => artifact(CLOSE, { used });

describe("slice edges", () => {
  test("open, status and close move one slice through", async () => {
    const m = memory(),
      e = edges(m.store);
    const opened = await invoke(
      e.open,
      open({ title: " First ", done: "used once" }),
    );
    expect(opened.artifact.value).toEqual({
      open: { number: 1, title: "First", done: "used once" },
      waiting: [],
      done: [],
    });
    expect(opened.claims).toHaveLength(1);
    expect(
      (await invoke(e.status, artifact(STATUS, {}))).artifact.value,
    ).toEqual(opened.artifact.value);
    const closed = await invoke(e.close, close("tracked this test"));
    expect(closed.artifact.value).toEqual({
      open: null,
      waiting: [],
      done: [
        {
          number: 1,
          title: "First",
          done: "used once",
          used: "tracked this test",
          closed: "2026-11-03",
        },
      ],
    });
    const second = await invoke(
      e.open,
      open({ title: "Second", done: "d", detail: "more" }),
    );
    expect(readState(second.artifact.value).open).toEqual({
      number: 2,
      title: "Second",
      detail: "more",
      done: "d",
    });
  });

  test("refuses a second open slice and leaves state alone", async () => {
    const m = memory(),
      e = edges(m.store);
    await invoke(e.open, open({ title: "First", done: "d" }));
    await expect(
      invoke(e.open, open({ title: "Second", done: "d" })),
    ).rejects.toThrow("Slice 1 is still open");
    expect(m.writes()).toBe(1);
    expect(m.get().open?.title).toBe("First");
  });

  test("refuses closing when nothing is open", async () => {
    const m = memory();
    await expect(invoke(edges(m.store).close, close("x"))).rejects.toThrow(
      "No slice is open",
    );
    expect(m.writes()).toBe(0);
  });

  test("a built slice waits for its real use without blocking the next one", async () => {
    const m = memory(),
      e = edges(m.store);
    await invoke(e.open, open({ title: "Replay", done: "a real replay" }));
    await expect(invoke(e.open, open({ title: "MCP", done: "used" }))).rejects.toThrow(
      "or move it to waiting until that use comes",
    );
    const waited = await invoke(e.wait, artifact(WAIT, {}));
    expect(waited.artifact.value).toMatchObject({ open: null, waiting: [{ number: 1, title: "Replay" }] });
    await expect(invoke(e.wait, artifact(WAIT, {}))).rejects.toThrow("No slice is open");

    // The next slice opens with the next number, and either can close first.
    await invoke(e.open, open({ title: "MCP", done: "used" }));
    const closedOpen = await invoke(e.close, close("served tasks over MCP"));
    expect(closedOpen.artifact.value).toMatchObject({ open: null, waiting: [{ number: 1 }], done: [{ number: 2 }] });
    await expect(invoke(e.close, close("x"))).rejects.toThrow("To close a waiting slice, give its number");
    await expect(invoke(e.close, artifact(CLOSE, { used: "x", number: "7" }))).rejects.toThrow("No slice 7 is waiting");
    const closedWaiting = await invoke(e.close, artifact(CLOSE, { used: "replayed an answer", number: "1" }));
    expect(closedWaiting.artifact.value).toMatchObject({
      waiting: [],
      done: [{ number: 2 }, { number: 1, used: "replayed an answer", closed: "2026-11-03" }],
    });
    expect((await invoke(e.open, open({ title: "Next", done: "d" }))).artifact.value).toMatchObject({
      open: { number: 3 },
    });
  });

  test("refuses missing, blank and unexpected fields", async () => {
    const e = edges(memory().store);
    await expect(invoke(e.open, open({ done: "d" }))).rejects.toThrow(
      "Missing field: title",
    );
    await expect(
      invoke(e.open, open({ title: "  ", done: "d" })),
    ).rejects.toThrow("title");
    await expect(
      invoke(e.open, open({ titel: "x", title: "x", done: "d" })),
    ).rejects.toThrow("Unexpected field: titel");
    await expect(
      invoke(e.status, artifact(STATUS, { all: "yes" })),
    ).rejects.toThrow("Unexpected field: all");
    await expect(invoke(e.close, artifact(CLOSE, {}))).rejects.toThrow(
      "Missing field: used",
    );
  });
});

describe("state", () => {
  test("refuses a slice number used twice, and reads files from before waiting slices", () => {
    const closed = { title: "t", done: "d", used: "u", closed: "2026-11-03" };
    expect(() =>
      readState({
        open: null,
        done: [
          { ...closed, number: 2 },
          { ...closed, number: 2 },
        ],
      }),
    ).toThrow("Each slice number must be used once");
    expect(() =>
      readState({
        open: { number: 1, title: "t", done: "d" },
        waiting: [],
        done: [{ ...closed, number: 1 }],
      }),
    ).toThrow("Each slice number must be used once");
    expect(readState({ open: null, done: [] })).toEqual(EMPTY);
  });

  test("renders the open slice and the latest five done slices", () => {
    expect(render(EMPTY)).toBe(
      "## Open slice\n\n_None. Only the owner opens the next slice._\n\n## Done\n\n_Nothing yet._",
    );
    const done = Array.from({ length: 7 }, (_, i) => ({
      number: i + 1,
      title: `S${i + 1}`,
      done: "d",
      used: `u${i + 1}`,
      closed: "2026-11-03",
    }));
    const page = render(
      readState({ open: { number: 8, title: "Next", done: "d" }, done }),
    );
    expect(page).toContain("**8. Next**\n\nDone when: d");
    expect(page).toContain(
      "- **7. S7** (closed 2026-11-03). Used for: u7\n- **6. S6**",
    );
    expect(page).not.toContain("S2**");
    expect(page).toContain("- _…and 2 earlier._");
    expect(page).not.toContain("Waiting for use");
    const waiting = render(readState({ open: null, waiting: [{ number: 8, title: "Next", done: "d" }], done }));
    expect(waiting).toContain("## Waiting for use\n\n- **8. Next**. Closes when: d\n\n## Done");
  });
});
