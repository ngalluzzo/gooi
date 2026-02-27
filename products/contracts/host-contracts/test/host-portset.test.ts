import { describe, expect, test } from "bun:test";
import {
	getMissingHostPortSetMembers,
	HostPortSetValidationError,
	parseHostPortSet,
} from "../src/portset/portset";

describe("host contracts - host port set", () => {
	test("returns host-port input as typed host-port set", () => {
		const portSet = parseHostPortSet({
			clock: { nowIso: () => "2026-02-27T00:00:00.000Z" },
			identity: {
				newTraceId: () => "trace-1",
				newInvocationId: () => "inv-1",
			},
			principal: {
				validatePrincipal: () => ({ ok: true }),
			},
			capabilityDelegation: {
				invokeDelegated: async () => ({ ok: false }),
			},
		});

		expect(typeof portSet.clock.nowIso).toBe("function");
		expect(typeof portSet.identity.newTraceId).toBe("function");
	});

	test("reports missing host-port members in deterministic order", () => {
		const missing = getMissingHostPortSetMembers({
			clock: {},
			identity: {
				newTraceId: () => "trace-1",
			},
		});

		expect(missing).toEqual([
			{ path: "clock.nowIso", expected: "function" },
			{ path: "identity.newInvocationId", expected: "function" },
			{ path: "principal.validatePrincipal", expected: "function" },
			{
				path: "capabilityDelegation.invokeDelegated",
				expected: "function",
			},
		]);
	});

	test("throws a typed validation error for invalid host-port sets", () => {
		expect(() =>
			parseHostPortSet({
				clock: {},
			}),
		).toThrow(HostPortSetValidationError);
	});
});
