import { describe, expect, test } from "bun:test";
import { activateProvider } from "../src/activation/activation";
import { invokeCapability } from "../src/invocation/invocation";
import {
	createContract,
	createHostPorts,
	createProviderModule,
	hostApiVersion,
	providerSpecifier,
} from "./fixtures/provider-runtime.fixture";

describe("provider-runtime invocation", () => {
	test("rejects undeclared observed effects at invocation time", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
			{
				observedEffects: ["network"],
			},
		);

		const activated = await activateProvider({
			providerSpecifier,
			hostApiVersion,
			contracts: [contract],
			hostPorts: createHostPorts(providerModule),
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
				id: "invocation_1",
				traceId: "trace_1",
				now: "2026-02-27T00:00:00.000Z",
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.kind).toBe("effect_violation_error");
		}
	});

	test("fails invocation with capability_unreachable_error when no contract is registered", async () => {
		const contract = createContract();
		const providerModule = createProviderModule(
			contract.artifacts.contractHash,
		);

		const activated = await activateProvider({
			providerSpecifier,
			hostApiVersion,
			contracts: [contract],
			hostPorts: createHostPorts(providerModule),
		});
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const result = await invokeCapability(activated.value, {
			portId: "ids.missing",
			portVersion: "1.0.0",
			input: { count: 1 },
			principal: {
				subject: "user_1",
				roles: ["authenticated"],
			},
			ctx: {
				id: "invocation_missing",
				traceId: "trace_missing",
				now: "2026-02-27T00:00:00.000Z",
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.kind).toBe("capability_unreachable_error");
		}
	});
});
