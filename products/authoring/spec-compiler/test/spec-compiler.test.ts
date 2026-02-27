import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "../src/compile/compile-bundle";
import {
	createAmbiguousReachabilityRequirementsFixture,
	createBindingFieldMismatchFixture,
	createComposableEntrypointSpecFixture,
	createInvalidReachabilityModeFixture,
	createUnknownReachabilityCapabilityIdFixture,
	createUnknownReachabilityCapabilityVersionFixture,
	createUnsupportedScalarSpecFixture,
} from "./fixtures/composable-entrypoint-spec.fixture";

describe("spec-compiler", () => {
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
		expect(
			first.bundle.artifactManifest.artifacts.bindingRequirements.artifactId,
		).toBe("CompiledBindingRequirements");
		expect(
			first.bundle.artifactManifest.artifacts.bindingRequirements.artifactHash,
		).toBe(first.bundle.bindingRequirementsArtifact.artifactHash);
		expect(
			first.bundle.artifactManifest.artifacts.bindingRequirements.compatibility
				.resolverInputContract,
		).toBe("CapabilityReachabilityRequirement@1.0.0");
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

	test("fails compilation when unsupported scalar annotation is used", () => {
		const fixture = createUnsupportedScalarSpecFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"unsupported_scalar_type",
			);
		}
	});

	test("fails compilation when binding references undeclared input field", () => {
		const fixture = createBindingFieldMismatchFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"binding_field_not_declared",
			);
		}
	});

	test("fails compilation when duplicate entrypoint ids are declared", () => {
		const fixture = createComposableEntrypointSpecFixture();
		fixture.queries = [
			{
				id: "list_messages",
				access: { roles: ["authenticated"] },
				in: { page: "int", page_size: "int", q: "text" },
				defaults: { page: 1, page_size: 10 },
				returns: { projection: "latest_messages" },
			},
			{
				id: "list_messages",
				access: { roles: ["authenticated"] },
				in: { page: "int", page_size: "int", q: "text" },
				defaults: { page: 1, page_size: 10 },
				returns: { projection: "messages_with_authors" },
			},
		];
		const result = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: fixture,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"duplicate_entrypoint_id",
			);
		}
	});

	test("fails compilation with deterministic ordering for invalid cross-section links", () => {
		const fixture = createComposableEntrypointSpecFixture() as Record<
			string,
			unknown
		>;
		const queries = fixture.queries as Array<Record<string, unknown>>;
		const mutations = fixture.mutations as Array<Record<string, unknown>>;
		const routes = fixture.routes as Array<Record<string, unknown>>;
		const scenarios = fixture.scenarios as Record<
			string,
			Record<string, unknown>
		>;

		const firstQuery = queries[0];
		if (firstQuery !== undefined) {
			firstQuery.returns = { projection: "projection_missing" };
		}
		const firstMutation = mutations[0];
		if (firstMutation !== undefined) {
			firstMutation.run = { actionId: "action_missing", input: {} };
		}
		const firstRoute = routes[0];
		if (firstRoute !== undefined) {
			firstRoute.renders = "screen_missing";
		}
		const firstScenario = scenarios.happy_path_message_submission;
		if (firstScenario !== undefined) {
			firstScenario.context = { persona: "persona_missing" };
		}

		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.every((item) => item.code.length > 0)).toBe(
				true,
			);
			expect(result.diagnostics.map((item) => item.path)).toEqual([
				"mutations.0.run.actionId",
				"queries.0.returns.projection",
				"routes.0.renders",
				"scenarios.happy_path_message_submission.context.persona",
			]);
		}
	});

	test("fails compilation for ambiguous reachability requirements", () => {
		const fixture = createAmbiguousReachabilityRequirementsFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics.map((item) => item.code)).toContain(
				"reachability_requirement_ambiguous",
			);
		}
	});

	test("fails compilation with deterministic diagnostics for invalid reachability mode", () => {
		const fixture = createInvalidReachabilityModeFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics[0]?.code).toBe("authoring_spec_invalid");
			expect(result.diagnostics[0]?.path).toBe(
				"wiring.requirements.capabilities.0.mode",
			);
		}
	});

	test("fails compilation when reachability references an unknown capability id", () => {
		const fixture = createUnknownReachabilityCapabilityIdFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics[0]?.code).toBe(
				"spec_reference_not_found_error",
			);
			expect(result.diagnostics[0]?.path).toBe(
				"wiring.requirements.capabilities.0.portId",
			);
		}
	});

	test("fails compilation when reachability references an unknown capability version", () => {
		const fixture = createUnknownReachabilityCapabilityVersionFixture();
		const result = compileEntrypointBundle({
			spec: fixture,
			compilerVersion: "1.0.0",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.diagnostics[0]?.code).toBe(
				"spec_reference_not_found_error",
			);
			expect(result.diagnostics[0]?.path).toBe(
				"wiring.requirements.capabilities.0.portVersion",
			);
		}
	});
});
