import { describe, expect, test } from "bun:test";
import {
	createHostActivationPolicyProvider,
	createStrictActivationPolicyPort,
} from "../src/activation-policy/activation-policy";

describe("host contracts - activation policy", () => {
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

	test("creates host activation policy providers", () => {
		const provider = createHostActivationPolicyProvider({
			manifest: {
				providerId: "gooi.providers.memory",
				providerVersion: "1.0.0",
				hostApiRange: "^1.0.0",
			},
			createPort: createStrictActivationPolicyPort,
		});

		expect(provider.manifest.contract.id).toBe("gooi.host.activation-policy");
		expect(typeof provider.createPort).toBe("function");
	});
});
