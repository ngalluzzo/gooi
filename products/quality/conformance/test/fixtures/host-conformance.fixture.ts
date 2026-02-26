import { defineCapabilityPort } from "@gooi/contracts-capability";
import { z } from "zod";
import { createEntrypointConformanceFixture } from "./entrypoint-conformance.fixture";

/**
 * Builds host conformance fixture input.
 */
export const createHostConformanceFixture = () => {
	const entrypointFixture = createEntrypointConformanceFixture();
	const providerContract = defineCapabilityPort({
		id: "ids.generate",
		version: "1.0.0",
		input: z.object({ count: z.number().int().positive() }),
		output: z.object({ ids: z.array(z.string()) }),
		error: z.object({ code: z.string(), message: z.string() }),
		declaredEffects: ["compute"],
	});

	return {
		bundle: entrypointFixture.bundle,
		queryBinding: entrypointFixture.queryBinding,
		queryRequest: entrypointFixture.queryRequest,
		principal: entrypointFixture.authorizedPrincipal,
		domainRuntime: entrypointFixture.domainRuntime,
		providerContract,
		providerHostApiVersion: "1.0.0",
	};
};
