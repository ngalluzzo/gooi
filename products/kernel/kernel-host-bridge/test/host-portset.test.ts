import { describe, expect, test } from "bun:test";
import { parseKernelHostPortSet } from "../src/host-portset";

describe("kernel-host-bridge scaffold", () => {
	test("returns host-port input as typed host-port set", () => {
		const portSet = parseKernelHostPortSet({
			clock: { nowIso: () => "2026-02-27T00:00:00.000Z" },
			identity: {
				newTraceId: () => "trace-1",
				newInvocationId: () => "inv-1",
			},
			principal: {
				validatePrincipal: () => ({ ok: true }),
				deriveRoles: () => ({ ok: true }),
			},
			capabilityDelegation: {
				invokeDelegated: async () => ({ ok: false }),
			},
		});

		expect(typeof portSet.clock.nowIso).toBe("function");
		expect(typeof portSet.identity.newTraceId).toBe("function");
	});
});
