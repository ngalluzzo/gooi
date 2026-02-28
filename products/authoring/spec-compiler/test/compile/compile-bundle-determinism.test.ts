import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../../src/compile/compile-bundle";
import { createComposableEntrypointSpecFixture } from "../fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler compile", () => {
	test("compiles deterministic entrypoint bundle for valid spec fixture", () => {
		const fixture = createComposableEntrypointSpecFixture();
		const first = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});
		const second = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) {
			return;
		}

		expect(Object.keys(first.bundle.entrypoints)).toEqual([
			"query:list_messages",
			"mutation:submit_message",
		]);
		expect(Object.keys(first.bundle.bindings)).toEqual([
			"http:query:list_messages",
			"http:mutation:submit_message",
		]);
		expect(Object.keys(first.bundle.reachabilityRequirements ?? {})).toEqual([
			"ids.generate@1.0.0",
			"legacy.audit@1.0.0",
			"notifications.send@1.0.0",
		]);
		expect(
			first.bundle.reachabilityRequirements?.["ids.generate@1.0.0"]?.mode,
		).toBe("local");
		expect(
			first.bundle.reachabilityRequirements?.["notifications.send@1.0.0"]?.mode,
		).toBe("delegated");
		expect(
			first.bundle.reachabilityRequirements?.["legacy.audit@1.0.0"]?.mode,
		).toBe("unreachable");
		expect(first.bundle.bindingRequirementsArtifact.artifactId).toBe(
			"CompiledBindingRequirements",
		);
		expect(
			first.bundle.bindingRequirementsArtifact.requirements[
				"ids.generate@1.0.0"
			]?.mode,
		).toBe("local");
		expect(
			first.bundle.bindingRequirementsArtifact.compatibility.supportedModes,
		).toEqual(["local", "delegated", "unreachable"]);
		expect(Object.keys(first.bundle.viewRenderIR.screens)).toEqual(["home"]);
		expect(Object.keys(first.bundle.viewRenderIR.nodes)).toEqual([
			"messages_list",
		]);
		expect(Object.keys(first.bundle.projectionIR.projections)).toEqual([
			"latest_messages",
			"messages_with_authors",
		]);
		expect(Object.keys(first.bundle.projectionIR.queries)).toEqual([
			"list_messages",
		]);
		expect(first.bundle.domainRuntimeIR.artifactVersion).toBe("1.0.0");
		expect(first.bundle.sessionIR.artifactVersion).toBe("1.0.0");
		expect(first.bundle.scenarioIR.artifactVersion).toBe("1.0.0");
		expect(Object.keys(first.bundle.laneArtifacts)).toEqual([
			"authoringCanonicalModel",
			"bindingRequirements",
			"domainRuntimeIR",
			"projectionIR",
			"qualityConformanceSeed",
			"runtimeEntrypointContracts",
			"scenarioIR",
			"sessionIR",
			"viewRenderIR",
		]);
		expect(Object.keys(first.bundle.artifactManifest.artifacts)).toEqual([
			"authoringCanonicalModel",
			"bindingRequirements",
			"domainRuntimeIR",
			"projectionIR",
			"qualityConformanceSeed",
			"runtimeEntrypointContracts",
			"scenarioIR",
			"sessionIR",
			"viewRenderIR",
		]);

		const bindingRequirementsRef =
			first.bundle.artifactManifest.artifacts.bindingRequirements;
		expect(bindingRequirementsRef).toBeDefined();
		if (bindingRequirementsRef !== undefined) {
			const bindingRequirementsArtifact =
				first.bundle.laneArtifacts.bindingRequirements;
			expect(bindingRequirementsArtifact).toBeDefined();
			expect(bindingRequirementsRef.artifactId).toBe(
				"CompiledBindingRequirements",
			);
			if (bindingRequirementsArtifact !== undefined) {
				expect(bindingRequirementsRef.artifactHash).toBe(
					bindingRequirementsArtifact.artifactHash,
				);
			}
			expect(bindingRequirementsRef.compatibility).toEqual(
				expect.objectContaining({
					resolverInputContract: "CapabilityReachabilityRequirement@1.0.0",
				}),
			);
		}
		const subscription = first.bundle.refreshSubscriptions.list_messages;
		expect(subscription).toBeDefined();
		if (subscription !== undefined) {
			expect(subscription.signalIds).toEqual([
				"message.created",
				"message.deleted",
			]);
		}
		expect(first.bundle.artifactHash).toBe(second.bundle.artifactHash);
		expect(first.bundle.sourceSpecHash).toBe(second.bundle.sourceSpecHash);
		expect(first.bundle.bindingRequirementsArtifact.artifactHash).toBe(
			second.bundle.bindingRequirementsArtifact.artifactHash,
		);
		expect(first.bundle.artifactManifest.aggregateHash).toBe(
			second.bundle.artifactManifest.aggregateHash,
		);
	});
});
