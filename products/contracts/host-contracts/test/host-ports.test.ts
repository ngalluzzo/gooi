import { describe, expect, test } from "bun:test";
import { hostOk } from "@gooi/host-contracts/result";
import { createSystemClockPort } from "../src/clock/clock";
import { createSystemIdentityPort } from "../src/identity/identity";
import { createHostPrincipalPort } from "../src/principal/principal";
import { createHostReplayStorePort } from "../src/replay/replay";

describe("host contracts - ports", () => {
	test("creates system ports", () => {
		const clock = createSystemClockPort();
		const identity = createSystemIdentityPort({
			tracePrefix: "trace_",
			invocationPrefix: "inv_",
		});

		expect(typeof clock.nowIso).toBe("function");
		expect(clock.nowIso()).toEqual(expect.any(String));
		expect(identity.newTraceId()).toStartWith("trace_");
		expect(identity.newInvocationId()).toStartWith("inv_");
	});

	test("creates principal and replay ports", async () => {
		const principal = createHostPrincipalPort({
			validatePrincipal: (value) =>
				hostOk({
					subject: value === null ? null : "user_1",
					claims: {},
					tags: [],
				}),
			deriveRoles: () => hostOk(["authenticated"]),
		});
		const records = new Map<
			string,
			{ inputHash: string; result: { ok: boolean } }
		>();
		const replay = createHostReplayStorePort({
			load: async (scopeKey) => records.get(scopeKey) ?? null,
			save: async ({ scopeKey, record }) => {
				records.set(scopeKey, record);
			},
		});

		const validated = principal.validatePrincipal({
			subject: "user_1",
		} as never);
		expect(validated.ok).toBe(true);

		await replay.save({
			scopeKey: "scope_1",
			record: { inputHash: "hash_1", result: { ok: true } },
			ttlSeconds: 60,
		});
		const loaded = await replay.load("scope_1");
		expect(loaded).not.toBeNull();
		expect(loaded?.result.ok).toBe(true);
	});
});
