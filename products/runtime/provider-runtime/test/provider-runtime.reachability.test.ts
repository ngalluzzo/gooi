import { describe, expect, test } from "bun:test";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import { activateProvider } from "../src/activation/activation";
import { invokeCapability } from "../src/invocation/invocation";
import {
	createBindingPlan,
	createContract,
	createDelegatedResolution,
	createLocalResolution,
	createLockfile,
	createProviderModule,
	hostApiVersion,
} from "./fixtures/provider-runtime.fixture";

describe("provider-runtime reachability", () => {
	test("invokes delegated route metadata when binding resolution is delegated", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
			{
				invokeBehavior: "throw",
			},
		);
		const delegatedCalls: string[] = [];

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(createDelegatedResolution()),
			lockfile: createLockfile(contract.artifacts.contractHash),
			hostPorts: {
				clock: { nowIso: () => "2026-02-27T00:00:00.000Z" },
				activationPolicy: {
					assertHostVersionAligned: () => hostOk(undefined),
				},
				capabilityDelegation: {
					invokeDelegated: async (input) => {
						delegatedCalls.push(input.routeId);
						return hostOk({
							ok: true,
							output: { ids: ["delegated_1", "delegated_2"] },
							observedEffects: ["compute"],
						});
					},
				},
			},
		});
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const result = await invokeCapability(activated.value, {
			portId: "ids.generate",
			portVersion: "1.0.0",
			input: { count: 2 },
			principal: {
				subject: "user_1",
				roles: ["authenticated"],
			},
			ctx: {
				id: "invocation_delegated",
				traceId: "trace_delegated",
				now: "2026-02-27T00:00:00.000Z",
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.output).toEqual({
			ids: ["delegated_1", "delegated_2"],
		});
		expect(result.value.reachabilityMode).toBe("delegated");
		expect(delegatedCalls).toEqual(["route-node-1"]);
	});

	test("reports local reachability metadata when invocation resolves locally", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(createLocalResolution()),
			lockfile: createLockfile(contract.artifacts.contractHash),
		});
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const result = await invokeCapability(activated.value, {
			portId: "ids.generate",
			portVersion: "1.0.0",
			input: { count: 1 },
			principal: {
				subject: "user_1",
				roles: ["authenticated"],
			},
			ctx: {
				id: "invocation_local",
				traceId: "trace_local",
				now: "2026-02-27T00:00:00.000Z",
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.value.reachabilityMode).toBe("local");
	});

	test("fails delegated invocation without implicit local fallback", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
			{
				invokeBehavior: "throw",
			},
		);

		const activated = await activateProvider({
			providerModule,
			hostApiVersion,
			contracts: [contract],
			bindingPlan: createBindingPlan(
				createDelegatedResolution({ routeId: "route-node-down" }),
			),
			lockfile: createLockfile(contract.artifacts.contractHash),
			hostPorts: {
				clock: { nowIso: () => "2026-02-27T00:00:00.000Z" },
				activationPolicy: {
					assertHostVersionAligned: () => hostOk(undefined),
				},
				capabilityDelegation: {
					invokeDelegated: async () =>
						hostFail(
							"delegation_route_unavailable",
							"Delegation route is unavailable.",
						),
				},
			},
		});
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const result = await invokeCapability(activated.value, {
			portId: "ids.generate",
			portVersion: "1.0.0",
			input: { count: 1 },
			principal: {
				subject: "user_1",
				roles: ["authenticated"],
			},
			ctx: {
				id: "invocation_delegation_error",
				traceId: "trace_delegation_error",
				now: "2026-02-27T00:00:00.000Z",
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.kind).toBe("capability_delegation_error");
		}
	});
});
