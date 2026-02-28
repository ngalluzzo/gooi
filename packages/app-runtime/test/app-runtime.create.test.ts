import { describe, expect, test } from "bun:test";
import type { AppRuntimeInvocationMeasurement } from "@gooi/app-runtime-facade-contracts/create";
import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import type { BindingPlan } from "@gooi/marketplace-contracts/binding-plan";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { createAppRuntime } from "../src/create/create-app-runtime";
import {
	createDomainRuntimePortFixture,
	createHostPortSetFixture,
	createRuntimeSpecFixture,
} from "./fixtures/app-runtime.fixture";

describe("@gooi/app-runtime create", () => {
	test("composes runtime invocation with semantic parity to kernel entrypoint execution", async () => {
		const compiled = compileEntrypointBundle({
			spec: createRuntimeSpecFixture(),
			compilerVersion: "1.0.0",
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const facadeHostPorts = createHostPortSetFixture();
		const baselineHostPorts = createHostPortSetFixture();
		const domainRuntime = createDomainRuntimePortFixture();
		const facadeRuntime = createAppRuntime({
			bundle: compiled.bundle,
			hostPorts: facadeHostPorts,
			domainRuntime,
		});
		const invokeInput = {
			surfaceId: "http",
			entrypointKind: "query" as const,
			entrypointId: "list_messages",
			payload: { page: 1, page_size: 10 },
			principal: { subject: "user-1", claims: {}, tags: [] },
		};
		const facadeResult = await facadeRuntime.invoke(invokeInput);
		const binding = Object.values(compiled.bundle.bindings).find(
			(item) =>
				item.surfaceId === invokeInput.surfaceId &&
				item.entrypointKind === invokeInput.entrypointKind &&
				item.entrypointId === invokeInput.entrypointId,
		);
		expect(binding).toBeDefined();
		if (binding === undefined) {
			return;
		}
		const baselineResult = await runEntrypointThroughKernel({
			bundle: compiled.bundle,
			binding,
			payload: invokeInput.payload,
			principal: invokeInput.principal,
			domainRuntime,
			hostPorts: baselineHostPorts,
		});
		expect(JSON.stringify(facadeResult)).toBe(JSON.stringify(baselineResult));
	});

	test("reports bounded observable overhead for runtime helper invocation", async () => {
		const compiled = compileEntrypointBundle({
			spec: createRuntimeSpecFixture(),
			compilerVersion: "1.0.0",
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const observed: AppRuntimeInvocationMeasurement[] = [];
		const runtime = createAppRuntime({
			bundle: compiled.bundle,
			hostPorts: createHostPortSetFixture(),
			domainRuntime: createDomainRuntimePortFixture(),
			onInvokeMeasured: (measurement) => {
				observed.push(measurement);
			},
		});
		await runtime.invoke({
			surfaceId: "http",
			entrypointKind: "query",
			entrypointId: "list_messages",
			payload: { page: 1, page_size: 10 },
			principal: { subject: "user-1", claims: {}, tags: [] },
		});
		expect(observed).toHaveLength(1);
		expect(observed[0]).toEqual(
			expect.objectContaining({
				surfaceId: "http",
				entrypointKind: "query",
				entrypointId: "list_messages",
				bindingMatched: true,
			}),
		);
		expect(observed[0]?.overheadMs).toBeGreaterThanOrEqual(0);
	});

	test("preserves canonical typed runtime errors on missing entrypoint binding", async () => {
		const compiled = compileEntrypointBundle({
			spec: createRuntimeSpecFixture(),
			compilerVersion: "1.0.0",
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const runtime = createAppRuntime({
			bundle: compiled.bundle,
			hostPorts: createHostPortSetFixture(),
			domainRuntime: createDomainRuntimePortFixture(),
		});
		const result = await runtime.invoke({
			surfaceId: "http",
			entrypointKind: "query",
			entrypointId: "missing_query",
			payload: { page: 1, page_size: 10 },
			principal: { subject: "user-1", claims: {}, tags: [] },
		});
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error?.code).toBe("entrypoint_not_found_error");
	});

	test("surfaces delegated reachability requirements without hiding route requirements", () => {
		const compiled = compileEntrypointBundle({
			spec: createRuntimeSpecFixture(),
			compilerVersion: "1.0.0",
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const runtime = createAppRuntime({
			bundle: compiled.bundle,
			hostPorts: createHostPortSetFixture(),
			domainRuntime: createDomainRuntimePortFixture(),
		});
		const reachability = runtime.describeReachability({
			portId: "notifications.send",
			portVersion: "1.0.0",
		});
		expect(reachability).toEqual({
			portId: "notifications.send",
			portVersion: "1.0.0",
			mode: "delegated",
			source: "requirements",
			delegateRouteRequired: true,
		});
	});

	test("resolves delegated route metadata from deployment binding plan", () => {
		const compiled = compileEntrypointBundle({
			spec: createRuntimeSpecFixture(),
			compilerVersion: "1.0.0",
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const bindingPlan: BindingPlan = {
			appId: "app_runtime_demo",
			environment: "dev",
			hostApiVersion: "1.0.0",
			capabilityBindings: [
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					resolution: {
						mode: "delegated",
						targetHost: "node",
						providerId: "gooi.providers.notifications",
						delegateRouteId: "route-node-1",
					},
				},
			],
		};
		const runtime = createAppRuntime({
			bundle: compiled.bundle,
			hostPorts: createHostPortSetFixture(),
			domainRuntime: createDomainRuntimePortFixture(),
			bindingPlan,
		});
		const reachability = runtime.describeReachability({
			portId: "notifications.send",
			portVersion: "1.0.0",
		});
		expect(reachability).toEqual({
			portId: "notifications.send",
			portVersion: "1.0.0",
			mode: "delegated",
			source: "binding_plan",
			targetHost: "node",
			providerId: "gooi.providers.notifications",
			delegateRouteId: "route-node-1",
			delegateRouteRequired: false,
		});
	});
});
