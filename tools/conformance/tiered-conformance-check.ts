#!/usr/bin/env bun

import { getTieredConformanceDefinition } from "../../products/quality/conformance/src/tiered-conformance/definitions";
import { runTieredConformance } from "../../products/quality/conformance/src/tiered-conformance/run-tiered-conformance";

const repoRoot = process.cwd();

const suiteCommands: Readonly<Record<string, string[]>> = Object.freeze({
	determinism_gate: ["bun", "run", "conformance:determinism"],
	entrypoint_conformance: [
		"bun",
		"test",
		"products/quality/conformance/test/entrypoint-conformance.test.ts",
	],
	provider_conformance: [
		"bun",
		"test",
		"products/quality/conformance/test/provider-conformance.test.ts",
	],
	entrypoint_provider_host_replay: [
		"bun",
		"test",
		"products/quality/conformance/test/entrypoint-conformance.test.ts",
		"products/quality/conformance/test/provider-conformance.test.ts",
		"products/quality/conformance/test/host-conformance.test.ts",
		"products/quality/conformance/test/host-replay-baseline.test.ts",
		"products/quality/conformance/test/replay-store-conformance.test.ts",
	],
	projection_reachability: [
		"bun",
		"test",
		"products/quality/conformance/test/projection-conformance.test.ts",
		"products/quality/conformance/test/reachability-parity-conformance.test.ts",
	],
	dispatch_render_transport: [
		"bun",
		"test",
		"products/quality/conformance/test/dispatch-render-conformance.test.ts",
		"products/quality/conformance/test/render-adapter-conformance.test.ts",
		"products/quality/conformance/test/render-refresh-conformance.test.ts",
		"products/quality/conformance/test/surface-transport-consistency-conformance.test.ts",
	],
	guard_scenario: [
		"bun",
		"test",
		"products/quality/conformance/test/guard-conformance.test.ts",
		"products/quality/conformance/test/scenario-conformance.test.ts",
	],
	authoring_cross_client_lane_harness: [
		"bun",
		"test",
		"products/quality/conformance/test/authoring-conformance.test.ts",
		"products/quality/conformance/test/cross-client-readiness-conformance.test.ts",
		"products/quality/conformance/test/lane-harness-conformance.test.ts",
	],
	marketplace_control_plane: [
		"bun",
		"run",
		"conformance:marketplace:control-plane",
	],
	marketplace_resolution: ["bun", "run", "conformance:marketplace:resolution"],
});

const parseTier = (): "smoke" | "full" | "expanded" => {
	const tierArg = process.argv.find((value) => value.startsWith("--tier="));
	if (tierArg === undefined) {
		return "smoke";
	}
	const tierValue = tierArg.slice("--tier=".length);
	if (
		tierValue === "smoke" ||
		tierValue === "full" ||
		tierValue === "expanded"
	) {
		return tierValue;
	}
	throw new Error(
		`Unsupported --tier value '${tierValue}'. Expected smoke|full|expanded.`,
	);
};

const runSuiteCommand = async (suiteId: string) => {
	const command = suiteCommands[suiteId];
	if (command === undefined) {
		return {
			suiteId,
			passed: false,
			runtimeMs: 0,
			flakyRate: 1,
			detail: `No command mapping defined for suite '${suiteId}'.`,
		};
	}
	const startedAt = performance.now();
	const result = Bun.spawnSync(command, {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const runtimeMs = Math.max(0, Math.round(performance.now() - startedAt));
	const passed = result.exitCode === 0;
	const output = result.stdout.toString().trim();
	const errors = result.stderr.toString().trim();
	return {
		suiteId,
		passed,
		runtimeMs,
		flakyRate: passed ? 0 : 1,
		detail: passed
			? `Passed: ${command.join(" ")}`
			: `Failed (${result.exitCode}): ${command.join(" ")}${errors.length > 0 ? ` | ${errors}` : output.length > 0 ? ` | ${output}` : ""}`,
	};
};

const main = async () => {
	const tier = parseTier();
	const definition = getTieredConformanceDefinition(tier);
	const report = await runTieredConformance({
		definition,
		executeSuite: async (suite) => runSuiteCommand(suite.suiteId),
	});

	console.log(
		`Tier '${report.tierId}' (${report.gateRole}) strategy v${report.version}`,
	);
	report.suites.forEach((suite) => {
		console.log(
			`- ${suite.suiteId}: passed=${suite.passed} runtimeMs=${suite.runtimeMs} flakyRate=${suite.flakyRate.toFixed(2)}`,
		);
	});
	if (!report.passed) {
		console.error("Tiered conformance gate failed:");
		report.checks
			.filter((check) => !check.passed)
			.forEach((check) => {
				console.error(`- ${check.id}: ${check.detail}`);
			});
		process.exit(1);
	}
	console.log("Tiered conformance gate passed.");
};

main();
