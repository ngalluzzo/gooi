import { capabilityReachabilityModeSchema } from "@gooi/marketplace-contracts/reachability/contracts";
import { surfaceBindMapSchema } from "@gooi/surface-contracts/binding";
import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});

/**
 * `wiring.requirements.capabilities` item schema.
 */
export const reachabilityRequirementSchema = strictObjectWithExtensions({
	/** Identifier of the capability port this requirement applies to. Must reference a declared capability in the `domain` section. */
	portId: z.string().min(1),
	/** Semver version constraint for the capability port. Must follow `MAJOR.MINOR.PATCH` format. */
	portVersion: semverSchema,
	/** Execution locality requirement for this capability. `local` means the capability must execute in-process; `delegated` routes execution to a remote provider; `unreachable` explicitly marks this capability as unavailable in this deployment. */
	mode: capabilityReachabilityModeSchema,
});

const wiringBindingSchema = strictObjectWithExtensions({
	/** Map of surface input keys to entrypoint input field names. Wires adapter-layer inputs to the compiled entrypoint contract at dispatch time. */
	bind: surfaceBindMapSchema,
});

const surfaceSchema = strictObjectWithExtensions({
	/** Optional map of query entrypoint IDs to their surface binding configurations for this surface. */
	queries: z.record(z.string(), wiringBindingSchema).optional(),
	/** Optional map of mutation entrypoint IDs to their surface binding configurations for this surface. */
	mutations: z.record(z.string(), wiringBindingSchema).optional(),
	/** Optional map of route entrypoint IDs to their surface binding configurations for this surface. */
	routes: z.record(z.string(), wiringBindingSchema).optional(),
});

/**
 * `wiring` section authoring contract.
 */
export const wiringSectionSchema = strictObjectWithExtensions({
	/** Map of surface IDs to their binding configurations. Each surface declares query, mutation, and route bind maps used at dispatch time. */
	surfaces: z.record(z.string(), surfaceSchema),
	/** Optional capability reachability requirement declarations consumed by the deployment binding resolver when generating capability binding plans. */
	requirements: strictObjectWithExtensions({
		/** Optional list of capability reachability requirements for this app. Each entry declares a port ID, version, and execution locality mode. */
		capabilities: z.array(reachabilityRequirementSchema).optional(),
	}).optional(),
});

/**
 * Parsed `wiring` section type.
 */
export type WiringSection = z.infer<typeof wiringSectionSchema>;
