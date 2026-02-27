import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});

const capabilitySchema = strictObjectWithExtensions({
	version: semverSchema.optional(),
});

/**
 * `domain` section authoring contract.
 */
export const domainSectionSchema = strictObjectWithExtensions({
	collections: z.record(z.string(), z.unknown()).optional(),
	signals: z.record(z.string(), z.unknown()).optional(),
	capabilities: z.record(z.string(), capabilitySchema).optional(),
	actions: z.record(z.string(), z.unknown()).optional(),
	flows: z.record(z.string(), z.unknown()).optional(),
	projections: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Parsed `domain` section type.
 */
export type DomainSection = z.infer<typeof domainSectionSchema>;
