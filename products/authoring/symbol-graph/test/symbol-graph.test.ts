import { describe, expect, test } from "bun:test";

import { buildSymbolGraphSnapshot } from "../src/build-symbol-graph-snapshot/build-symbol-graph-snapshot";
import { deriveSignalImpactEdges } from "../src/derive-signal-impact-edges/derive-signal-impact-edges";
import { parseSymbolGraphSnapshot } from "../src/parse-symbol-graph-snapshot/parse-symbol-graph-snapshot";
import { symbolGraphBuildFixture } from "./fixtures/symbol-graph.fixture";
import symbolGraphGolden from "./fixtures/symbol-graph.golden.json";

describe("symbol-graph", () => {
	test("builds deterministic symbol graph snapshot artifact", () => {
		const snapshot = buildSymbolGraphSnapshot(symbolGraphBuildFixture);
		expect(snapshot).toEqual(parseSymbolGraphSnapshot(symbolGraphGolden));
	});

	test("derives signal impact chain edges for affected-query lenses", () => {
		const edges = deriveSignalImpactEdges(symbolGraphBuildFixture.signalImpact);
		expect(edges).toContainEqual({
			fromSymbolId: "action:guestbook.submit",
			toSymbolId: "signal:message.created",
			relationship: "emits_signal",
		});
		expect(edges).toContainEqual({
			fromSymbolId: "signal:message.created",
			toSymbolId: "entrypoint:home.data.messages",
			relationship: "refresh_subscription",
		});
		expect(edges).toContainEqual({
			fromSymbolId: "action:guestbook.submit",
			toSymbolId: "entrypoint:home.data.messages",
			relationship: "impacts_query",
		});
	});

	test("parses snapshot and enforces artifact hash integrity", () => {
		const parsed = parseSymbolGraphSnapshot(symbolGraphGolden);
		expect(parsed.artifactHash).toBe(symbolGraphGolden.artifactHash);
		expect(() =>
			parseSymbolGraphSnapshot({
				...symbolGraphGolden,
				artifactHash: "0".repeat(64),
			}),
		).toThrow(
			"Symbol graph artifactHash does not match normalized snapshot content.",
		);
	});

	test("rejects snapshot build when reference edges include unknown symbol ids", () => {
		expect(() =>
			buildSymbolGraphSnapshot({
				...symbolGraphBuildFixture,
				references: [
					...symbolGraphBuildFixture.references,
					{
						fromSymbolId: "unknown:source",
						toSymbolId: "step:generated_ids",
						relationship: "references",
					},
				],
			}),
		).toThrow("Reference edge has unknown source symbol id: unknown:source");
	});
});
