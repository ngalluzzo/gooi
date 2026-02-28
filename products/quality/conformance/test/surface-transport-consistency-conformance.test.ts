import { describe, expect, test } from "bun:test";
import { runEntrypointThroughKernel } from "@gooi/execution-kernel/entrypoint";
import type { ResultEnvelope } from "@gooi/surface-contracts/envelope";
import { dispatchAndBindSurfaceIngress } from "@gooi/surface-runtime";
import {
	createDefaultConformanceHostPorts,
	type EntrypointHostPortSet,
} from "../src/entrypoint-conformance/run-entrypoint-through-kernel";
import { createSurfaceTransportConsistencyFixture } from "./fixtures/surface-transport-consistency.fixture";

const toComparableEnvelope = (value: ResultEnvelope<unknown, unknown>) => ({
	ok: value.ok,
	output: value.ok ? value.output : undefined,
	errorCode: value.ok ? undefined : value.error?.code,
	observedEffects: value.observedEffects,
	emittedSignals: value.emittedSignals.map((signal) => ({
		signalId: signal.signalId,
		payload: signal.payload,
		payloadHash: signal.payloadHash,
	})),
});

const buildHostPorts = (): EntrypointHostPortSet => {
	const base = createDefaultConformanceHostPorts();
	return {
		...base,
		clock: {
			nowIso: () => "2026-02-26T00:00:00.000Z",
		},
	};
};

describe("surface transport consistency conformance", () => {
	test("produces equivalent query outcomes for equivalent web/http/cli/webhook invocations", async () => {
		const fixture = createSurfaceTransportConsistencyFixture();
		const hostPorts = buildHostPorts();
		const outputs: Array<ReturnType<typeof toComparableEnvelope>> = [];

		for (const [surfaceId, ingress] of Object.entries(
			fixture.queryIngressBySurface,
		)) {
			const dispatch = dispatchAndBindSurfaceIngress({
				surfaceId,
				ingress,
				dispatchPlans: fixture.bundle.dispatchPlans,
				entrypoints: fixture.bundle.entrypoints,
				bindings: fixture.bundle.bindings,
			});
			expect(dispatch.ok).toBe(true);
			if (!dispatch.ok || dispatch.binding === undefined) {
				continue;
			}
			expect(dispatch.dispatch.entrypointId).toBe("list_messages");
			expect(dispatch.boundInput).toEqual({ page: 2 });

			const result = await runEntrypointThroughKernel({
				bundle: fixture.bundle,
				binding: dispatch.binding,
				payload: dispatch.boundInput,
				principal: fixture.principal,
				domainRuntime: fixture.domainRuntime,
				hostPorts,
				traceId: `trace_${surfaceId}_query`,
				invocationId: `inv_${surfaceId}_query`,
				now: "2026-02-26T00:00:00.000Z",
			});
			outputs.push(toComparableEnvelope(result));
		}

		expect(outputs.length).toBe(4);
		const baseline = outputs[0];
		expect(baseline).toBeDefined();
		if (baseline === undefined) {
			return;
		}
		for (const output of outputs) {
			expect(output).toEqual(baseline);
		}
	});

	test("produces equivalent mutation outcomes for equivalent web/http/cli/webhook invocations", async () => {
		const fixture = createSurfaceTransportConsistencyFixture();
		const hostPorts = buildHostPorts();
		const outputs: Array<ReturnType<typeof toComparableEnvelope>> = [];

		for (const [surfaceId, ingress] of Object.entries(
			fixture.mutationIngressBySurface,
		)) {
			const dispatch = dispatchAndBindSurfaceIngress({
				surfaceId,
				ingress,
				dispatchPlans: fixture.bundle.dispatchPlans,
				entrypoints: fixture.bundle.entrypoints,
				bindings: fixture.bundle.bindings,
			});
			expect(dispatch.ok).toBe(true);
			if (!dispatch.ok || dispatch.binding === undefined) {
				continue;
			}
			expect(dispatch.dispatch.entrypointId).toBe("submit_message");
			expect(dispatch.boundInput).toEqual({ message: "hello" });

			const result = await runEntrypointThroughKernel({
				bundle: fixture.bundle,
				binding: dispatch.binding,
				payload: dispatch.boundInput,
				principal: fixture.principal,
				domainRuntime: fixture.domainRuntime,
				hostPorts,
				traceId: `trace_${surfaceId}_mutation`,
				invocationId: `inv_${surfaceId}_mutation`,
				now: "2026-02-26T00:00:00.000Z",
			});
			outputs.push(toComparableEnvelope(result));
		}

		expect(outputs.length).toBe(4);
		const baseline = outputs[0];
		expect(baseline).toBeDefined();
		if (baseline === undefined) {
			return;
		}
		for (const output of outputs) {
			expect(output).toEqual(baseline);
		}
	});
});
