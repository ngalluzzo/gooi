import { describe, expect, test } from "bun:test";
import { runLaneHarnessConformance } from "../src/lane-harness-conformance/run-lane-harness-conformance";
import {
	createLaneHarnessFixture,
	createLaneHarnessMissingLaneFixture,
} from "./fixtures/lane-harness-conformance.fixture";

describe("lane harness conformance", () => {
	test("executes L0/L1/L2/L3 in one run with deterministic lane/check identifiers", async () => {
		const fixture = createLaneHarnessFixture();
		const report = await runLaneHarnessConformance(fixture);

		expect(report.passed).toBe(true);
		expect(
			report.checks.find((check) => check.id === "lane_matrix_complete")
				?.passed,
		).toBe(true);
		expect(report.laneCheckIdentifiers).toHaveLength(8);
		expect(report.laneCheckIdentifiers[0]?.qualifiedCheckId).toBe(
			"L0:semantic_parity",
		);
		expect(report.laneCheckIdentifiers[7]?.qualifiedCheckId).toBe(
			"L3:typed_envelope",
		);
	});

	test("flags missing required lanes", async () => {
		const fixture = createLaneHarnessMissingLaneFixture();
		const report = await runLaneHarnessConformance(fixture);

		expect(report.passed).toBe(false);
		expect(
			report.checks.find((check) => check.id === "lane_matrix_complete")
				?.passed,
		).toBe(false);
	});

	test("supports reproducibility checks against expected baseline digests", async () => {
		const fixture = createLaneHarnessFixture();
		const first = await runLaneHarnessConformance(fixture);
		const expected = Object.fromEntries(
			first.lanes.map((lane) => [lane.laneId, lane.digest]),
		) as Record<"L0" | "L1" | "L2" | "L3", string>;
		const second = await runLaneHarnessConformance({
			...fixture,
			expectedLaneDigests: expected,
		});

		expect(second.passed).toBe(true);
		expect(
			second.checks.find((check) => check.id === "baseline_reproducibility")
				?.passed,
		).toBe(true);

		const mismatch = await runLaneHarnessConformance({
			...fixture,
			expectedLaneDigests: {
				...expected,
				L3: "mismatch",
			},
		});
		expect(mismatch.passed).toBe(false);
		expect(
			mismatch.checks.find((check) => check.id === "baseline_reproducibility")
				?.passed,
		).toBe(false);
	});
});
