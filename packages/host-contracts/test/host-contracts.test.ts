import { describe, expect, test } from "bun:test";
import {
	createStrictActivationPolicyPort,
	createSystemClockPort,
	createSystemIdentityPort,
	hostFail,
	hostOk,
} from "../src/host-contracts/host-contracts.contracts";

describe("host-contracts", () => {
	test("creates ok and error host port envelopes", () => {
		const ok = hostOk({ value: 1 });
		const fail = hostFail("bad_request", "Invalid input", { field: "id" });

		expect(ok.ok).toBe(true);
		expect(fail.ok).toBe(false);
		if (!fail.ok) {
			expect(fail.error.code).toBe("bad_request");
		}
	});

	test("validates host API alignment strictly", () => {
		const policy = createStrictActivationPolicyPort();
		const aligned = policy.assertHostVersionAligned({
			runtimeHostApiVersion: "1.0.0",
			bindingPlanHostApiVersion: "1.0.0",
			lockfileHostApiVersion: "1.0.0",
		});
		const misaligned = policy.assertHostVersionAligned({
			runtimeHostApiVersion: "2.0.0",
			bindingPlanHostApiVersion: "1.0.0",
			lockfileHostApiVersion: "1.0.0",
		});

		expect(aligned.ok).toBe(true);
		expect(misaligned.ok).toBe(false);
		if (!misaligned.ok) {
			expect(misaligned.error.code).toBe("artifact_alignment_error");
		}
	});

	test("creates system ports", () => {
		const clock = createSystemClockPort();
		const identity = createSystemIdentityPort({
			tracePrefix: "trace_",
			invocationPrefix: "inv_",
		});

		expect(typeof clock.nowIso()).toBe("string");
		expect(identity.newTraceId().startsWith("trace_")).toBe(true);
		expect(identity.newInvocationId().startsWith("inv_")).toBe(true);
	});
});
