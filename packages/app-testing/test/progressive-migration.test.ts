import { describe, expect, test } from "bun:test";
import { compileApp } from "@gooi/app/compile";
import { defineApp } from "@gooi/app/define";
import { createAppRuntime } from "@gooi/app-runtime/create";
import { specContracts } from "@gooi/app-spec-contracts/spec";
import { runScenarioConformance } from "@gooi/conformance/scenario";
import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { runAppScenarioConformance } from "../src/scenario-runner/run-app-scenario-conformance";
import {
	createProgressiveDomainRuntimeFixture,
	createProgressiveHostPortsFixture,
	createProgressiveInvokeInputFixture,
	createProgressiveScenarioFixture,
	createProgressiveSpecFixture,
} from "./fixtures/progressive-migration.fixture";

describe("progressive migration fixtures", () => {
	test("demonstrates L0/L1 to L2 migration with artifact and envelope parity", async () => {
		const spec = createProgressiveSpecFixture();

		const l0 = specContracts.parseGooiAppSpec(spec);
		const defined = defineApp({ spec });
		expect(defined.ok).toBe(true);
		if (!defined.ok) {
			return;
		}
		expect(JSON.stringify(defined.definition.spec)).toBe(JSON.stringify(l0));

		const l1Facade = compileApp({
			definition: defined.definition,
			compilerVersion: "1.0.0",
		});
		const l1LowLevel = compileEntrypointBundle({
			spec,
			compilerVersion: "1.0.0",
		});
		expect(JSON.stringify(l1Facade)).toBe(JSON.stringify(l1LowLevel));
		expect(l1Facade.ok).toBe(true);
		if (!l1Facade.ok) {
			return;
		}

		const invokeInput = createProgressiveInvokeInputFixture();
		const facadeHostPorts = createProgressiveHostPortsFixture();
		const baselineHostPorts = createProgressiveHostPortsFixture();
		const domainRuntime = createProgressiveDomainRuntimeFixture();

		const l2Runtime = createAppRuntime({
			bundle: l1Facade.bundle,
			hostPorts: facadeHostPorts,
			domainRuntime,
		});
		const l2Envelope = await l2Runtime.invoke(invokeInput);

		const binding = Object.values(l1Facade.bundle.bindings).find(
			(item) =>
				item.surfaceId === invokeInput.surfaceId &&
				item.entrypointKind === invokeInput.entrypointKind &&
				item.entrypointId === invokeInput.entrypointId,
		);
		expect(binding).toBeDefined();
		if (binding === undefined) {
			return;
		}
		const baselineEnvelope = await runEntrypointThroughKernel({
			bundle: l1Facade.bundle,
			binding,
			payload: invokeInput.payload,
			principal: invokeInput.principal,
			domainRuntime,
			hostPorts: baselineHostPorts,
		});
		expect(JSON.stringify(l2Envelope)).toBe(JSON.stringify(baselineEnvelope));
	});

	test("demonstrates L3 testing facade migration parity to base conformance harness", async () => {
		const fixture = createProgressiveScenarioFixture();
		const l3Facade = await runAppScenarioConformance({ fixture });
		const baseline = await runScenarioConformance({
			planSet: fixture.planSet,
			lockSnapshot: fixture.lockSnapshot,
			runScenario: fixture.harness.runScenario,
			runSuite: fixture.harness.runSuite,
			coverageReport: fixture.harness.coverageReport,
		});
		expect(JSON.stringify(l3Facade)).toBe(JSON.stringify(baseline));
	});
});
