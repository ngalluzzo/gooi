import { describe, expect, test } from "bun:test";
import {
	areBindingArtifactsAligned,
	getCapabilityBinding,
	getCapabilityBindingResolution,
	getLockedProvider,
	isCapabilityReachable,
	parseBindingPlan,
	parseDeploymentLockfile,
	providerHasLockedCapability,
} from "../src/binding-plan/binding-plan";

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
					resolution: {
						mode: "local",
						targetHost: "node",
						providerId: "gooi.providers.memory",
					},
				},
				{
					portId: "notifications.send",
					portVersion: "1.0.0",
					resolution: {
						mode: "delegated",
						targetHost: "node",
						providerId: "gooi.providers.http",
						delegateRouteId: "route-node-1",
					},
				},
				{
					portId: "db.write",
					portVersion: "1.0.0",
					resolution: {
						mode: "unreachable",
						reason: "No compatible execution host.",
					},
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
		expect(binding?.resolution.mode).toBe("local");
		if (binding?.resolution.mode === "local") {
			expect(binding.resolution.targetHost).toBe("node");
		}
		expect(
			getCapabilityBindingResolution(plan, "notifications.send", "1.0.0"),
		).toEqual({
			mode: "delegated",
			targetHost: "node",
			providerId: "gooi.providers.http",
			delegateRouteId: "route-node-1",
		});
		expect(
			isCapabilityReachable({
				mode: "unreachable",
				reason: "No compatible execution host.",
			}),
		).toBe(false);

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
