import { z } from "zod";
import { conformanceContractVersionSchema } from "../version/version";

const hexHashPattern = /^[a-f0-9]{64}$/i;

export const conformanceLaneIdSchema = z.enum(["L0", "L1", "L2", "L3"]);

export type ConformanceLaneId = z.infer<typeof conformanceLaneIdSchema>;

/**
 * Canonical fixture descriptor shared across conformance suites.
 */
export const conformanceFixtureDescriptorSchema = z.object({
	contractVersion: conformanceContractVersionSchema.default("1.0.0"),
	fixtureId: z.string().min(1),
	laneId: conformanceLaneIdSchema,
	fixtureHash: z.string().regex(hexHashPattern),
	artifactHashes: z.record(z.string().min(1), z.string().regex(hexHashPattern)),
});

export type ConformanceFixtureDescriptor = z.infer<
	typeof conformanceFixtureDescriptorSchema
>;

/**
 * Parses one conformance fixture descriptor payload.
 */
export const parseConformanceFixtureDescriptor = (
	value: unknown,
): ConformanceFixtureDescriptor =>
	conformanceFixtureDescriptorSchema.parse(value);
