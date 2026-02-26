import { describe, expect, test } from "bun:test";
import { performance } from "node:perf_hooks";

import { listAuthoringCompletionItems } from "../src/features/completion/list-authoring-completion-items";
import { publishAuthoringDiagnostics } from "../src/features/diagnostics/publish-authoring-diagnostics";
import { searchAuthoringWorkspaceSymbols } from "../src/features/navigation/search-authoring-workspace-symbols";
import { authoringReadFixture } from "./fixtures/authoring-read.fixture";

const percentile95 = (values: readonly number[]): number => {
	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
	return sorted[index] ?? 0;
};

const measure = (fn: () => void): number => {
	const started = performance.now();
	fn();
	return performance.now() - started;
};

const collectSamples = (fn: () => void): readonly number[] => {
	for (let index = 0; index < 10; index += 1) {
		fn();
	}
	const samples: number[] = [];
	for (let index = 0; index < 120; index += 1) {
		samples.push(measure(fn));
	}
	return samples;
};

describe("product-authoring-lsp latency thresholds", () => {
	test("keeps completion p95 below 50ms", () => {
		const p95 = percentile95(
			collectSamples(() => {
				listAuthoringCompletionItems({
					context: authoringReadFixture,
					position: { line: 3, character: 10 },
				});
			}),
		);
		expect(p95).toBeLessThan(50);
	});

	test("keeps diagnostics p95 below 200ms", () => {
		const p95 = percentile95(
			collectSamples(() => {
				publishAuthoringDiagnostics({ context: authoringReadFixture });
			}),
		);
		expect(p95).toBeLessThan(200);
	});

	test("keeps workspace symbol query p95 below 120ms", () => {
		const p95 = percentile95(
			collectSamples(() => {
				searchAuthoringWorkspaceSymbols({
					context: authoringReadFixture,
					query: "message",
				});
			}),
		);
		expect(p95).toBeLessThan(120);
	});
});
