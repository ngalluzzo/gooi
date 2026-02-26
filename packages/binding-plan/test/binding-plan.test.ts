import { describe, expect, test } from "bun:test";
import {
	areBindingArtifactsAligned,
	getCapabilityBinding,
	getLockedProvider,
	parseBindingPlan,
	parseDeploymentLockfile,
	providerHasLockedCapability,
} from "../src/index";

describe("binding-plan", () => {
	test("parses binding plan and lockfile", () => {
		const plan = parseBindingPlan({
			appId: "hello-world-demo-v8",
			environment: "dev",
			hostApiVersion: "1.0.0",
			capabilityBindings: [
				{
					portId: "ids.generate",
					portVersion: "1.0.0",
					providerId: "gooi.providers.memory",
				},
			],
		});

		const lockfile = parseDeploymentLockfile({
			appId: "hello-world-demo-v8",
			environment: "dev",
			hostApiVersion: "1.0.0",
			providers: [
				{
					providerId: "gooi.providers.memory",
					providerVersion: "1.2.3",
					integrity: "sha256:abc123",
					capabilities: [
						{
							portId: "ids.generate",
							portVersion: "1.0.0",
							contractHash:
								"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
						},
					],
				},
			],
		});

		expect(areBindingArtifactsAligned(plan, lockfile)).toBe(true);

		const binding = getCapabilityBinding(plan, "ids.generate", "1.0.0");
		expect(binding?.providerId).toBe("gooi.providers.memory");

		const provider = getLockedProvider(
			lockfile,
			"gooi.providers.memory",
			"1.2.3",
		);

		expect(provider).not.toBeNull();
		expect(
			providerHasLockedCapability(
				provider as NonNullable<typeof provider>,
				"ids.generate",
				"1.0.0",
				"0f8f7ea8a9d837f76f16fdb5bf8f95d727ec4fdd6d8f45f0c6bf3d9c7d17d2cf",
			),
		).toBe(true);
	});
});
