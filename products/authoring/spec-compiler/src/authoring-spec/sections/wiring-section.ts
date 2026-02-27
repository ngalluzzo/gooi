import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});

const bindMapSchema = z.record(z.string(), z.string().min(1));

/**
 * `wiring.requirements.capabilities` item schema.
 */
export const reachabilityRequirementSchema = strictObjectWithExtensions({
	portId: z.string().min(1),
	portVersion: semverSchema,
	mode: z.enum(["local", "delegated", "unreachable"]),
});

const wiringBindingSchema = strictObjectWithExtensions({
	bind: bindMapSchema,
});

const surfaceSchema = strictObjectWithExtensions({
	queries: z.record(z.string(), wiringBindingSchema).optional(),
	mutations: z.record(z.string(), wiringBindingSchema).optional(),
	routes: z.record(z.string(), wiringBindingSchema).optional(),
});

/**
 * `wiring` section authoring contract.
 */
export const wiringSectionSchema = strictObjectWithExtensions({
	surfaces: z.record(z.string(), surfaceSchema),
	requirements: strictObjectWithExtensions({
		capabilities: z.array(reachabilityRequirementSchema).optional(),
	}).optional(),
});

/**
 * Parsed `wiring` section type.
 */
export type WiringSection = z.infer<typeof wiringSectionSchema>;
