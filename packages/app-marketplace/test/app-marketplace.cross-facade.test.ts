import { describe, expect, test } from "bun:test";
import { compileApp } from "@gooi/app/compile";
import { defineApp } from "@gooi/app/define";
import { createAppRuntime } from "@gooi/app-runtime/create";
import { discoverProviders } from "../src/discover/discover-providers";
import { explainProviderEligibility } from "../src/eligibility/explain-provider-eligibility";
import { resolveTrustedProviders } from "../src/resolve/resolve-trusted-providers";
import {
	createCrossFacadeDiscoveryFixture,
	createDelegatedBindingPlanFixture,
} from "./fixtures/cross-facade.fixture";
import {
	createDomainRuntimePortFixture,
	createHostPortSetFixture,
	createRuntimeSpecFixture,
} from "./fixtures/runtime.fixture";

describe("@gooi/app-marketplace cross-facade integration", () => {
	test("composes app, runtime, and marketplace facades in one deterministic flow", async () => {
		const defined = defineApp({ spec: createRuntimeSpecFixture() });
		expect(defined.ok).toBe(true);
		if (!defined.ok) {
			return;
		}

		const compiled = compileApp({
			definition: defined.definition,
			compilerVersion: "1.0.0",
		});
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) {
			return;
		}

		const catalog = discoverProviders(createCrossFacadeDiscoveryFixture());
		const eligibility = explainProviderEligibility({
			catalog,
			requiredCertifications: ["soc2"],
		});
		expect(eligibility.ok).toBe(true);
		if (!eligibility.ok) {
			return;
		}

		const resolution = resolveTrustedProviders({
			report: eligibility.report,
			maxResults: 1,
		});
		expect(resolution.ok).toBe(true);
		if (!resolution.ok) {
			return;
		}

		const selected = resolution.decision.selected[0];
		expect(selected).toBeDefined();
		expect(selected?.providerId).toBe("gooi.providers.delegated");
		expect(selected?.reachability).toEqual({
			mode: "delegated",
			targetHost: "node",
			delegateRouteId: "route-node-1",
			delegateDescriptor: "https://gooi.dev/delegation/route-node-1",
		});
		if (selected?.reachability.mode !== "delegated") {
			return;
		}
		if (selected.reachability.delegateRouteId === undefined) {
			return;
		}

		const runtime = createAppRuntime({
			bundle: compiled.bundle,
			hostPorts: createHostPortSetFixture(),
			domainRuntime: createDomainRuntimePortFixture(),
			bindingPlan: createDelegatedBindingPlanFixture(
				selected.providerId,
				selected.reachability.delegateRouteId,
			),
		});
		const reachability = runtime.describeReachability({
			portId: "notifications.send",
			portVersion: "1.0.0",
		});

		expect(reachability.mode).toBe("delegated");
		if (reachability.mode !== "delegated") {
			return;
		}
		expect(reachability.providerId).toBe(selected.providerId);
		expect(reachability.delegateRouteId).toBe(
			selected.reachability.delegateRouteId,
		);

		const invocation = await runtime.invoke({
			surfaceId: "http",
			entrypointKind: "query",
			entrypointId: "list_messages",
			payload: { page: 1, page_size: 10 },
			principal: { subject: "user-1", claims: {}, tags: [] },
		});
		expect(invocation.ok).toBe(true);
	});
});
