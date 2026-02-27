import { describe, expect, test } from "bun:test";
import type { HostConformanceCheckId } from "../src/host-conformance/contracts";
import { runHostConformance } from "../src/host-conformance/run-host-conformance";
import { createHostConformanceFixture } from "./fixtures/host-conformance.fixture";

const expectedCheckOrder: HostConformanceCheckId[] = [
	"entrypoint_host_identity_used",
	"entrypoint_host_clock_used",
	"entrypoint_missing_clock_rejected",
	"entrypoint_missing_identity_rejected",
	"entrypoint_missing_principal_rejected",
	"entrypoint_missing_delegation_rejected",
	"provider_host_clock_used",
	"provider_activation_policy_used",
	"provider_missing_clock_rejected",
	"provider_missing_activation_policy_rejected",
	"provider_missing_delegation_rejected",
	"provider_missing_module_loader_rejected",
	"provider_missing_module_integrity_rejected",
];

describe("host conformance", () => {
	test("runs host contract conformance checks", async () => {
		const fixture = createHostConformanceFixture();
		const report = await runHostConformance(fixture);
		expect(report.passed).toBe(true);
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});

	test("returns deterministic check ids in stable order", async () => {
		const first = await runHostConformance(createHostConformanceFixture());
		const second = await runHostConformance(createHostConformanceFixture());

		expect(first.checks.map((check) => check.id)).toEqual(expectedCheckOrder);
		expect(second.checks.map((check) => check.id)).toEqual(expectedCheckOrder);
		expect(first.checks).toEqual(second.checks);
	});
});
