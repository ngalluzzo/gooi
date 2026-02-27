import { describe, expect, test } from "bun:test";
import { createKernelRuntime } from "../src/create-kernel-runtime";
import type { KernelInvokeInput } from "../src/invoke";

describe("execution-kernel scaffold", () => {
	test("creates a runtime with invoke and trace surfaces", async () => {
		const runtime = createKernelRuntime({
			invoke: async (input) => ({
				ok: true,
				output: {
					entrypointId: input.call.entrypointId,
					hasClock: typeof input.hostPorts.clock.nowIso === "function",
				},
			}),
			nowIso: () => "2026-02-27T00:00:00.000Z",
		});

		const invokeInput: KernelInvokeInput = {
			entrypointId: "q.latest",
			kind: "query",
			payload: {},
			principal: null,
			hostPorts: {
				clock: { nowIso: () => "2026-02-27T00:00:00.000Z" },
				identity: {
					newTraceId: () => "trace-1",
					newInvocationId: () => "inv-1",
				},
				principal: {
					validatePrincipal: () => ({ ok: true, value: null }),
					deriveRoles: () => ({ ok: true, value: [] }),
				},
				capabilityDelegation: {
					invokeDelegated: async () => ({
						ok: false,
						error: {
							code: "capability_delegation_error",
							message: "not configured",
						},
					}),
				},
			},
		};

		const result = await runtime.invoke(invokeInput);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.output).toEqual({
				entrypointId: "q.latest",
				hasClock: true,
			});
		}

		const trace = runtime.trace({
			entrypointId: "q.latest",
			kind: "query",
			stage: "surface_input.bind",
			traceId: "trace-1",
			invocationId: "inv-1",
		});
		expect(trace).toEqual({
			traceId: "trace-1",
			invocationId: "inv-1",
			entrypointId: "q.latest",
			kind: "query",
			stage: "surface_input.bind",
			timestamp: "2026-02-27T00:00:00.000Z",
		});
	});

	test("returns typed validation errors when host ports are invalid", async () => {
		const runtime = createKernelRuntime({
			invoke: async () => ({
				ok: true,
				output: { ok: true },
			}),
		});

		const result = await runtime.invoke({
			entrypointId: "q.invalid",
			kind: "query",
			payload: {},
			principal: null,
			hostPorts: {
				clock: {},
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("validation_error");
			expect(result.error.details).toEqual({
				code: "host_port_missing",
				missingHostPortMembers: expect.arrayContaining([
					expect.objectContaining({
						path: "clock.nowIso",
						expected: "function",
					}),
				]),
			});
		}
	});
});
