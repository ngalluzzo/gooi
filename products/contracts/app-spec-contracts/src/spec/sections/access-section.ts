import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const roleSchema = strictObjectWithExtensions({
	/** Optional human-readable description of this role's purpose and the access it grants. */
	description: z.string().optional(),
	/** Optional list of role IDs whose permissions this role inherits. Permissions are evaluated additively across all extended roles. */
	extends: z.array(z.string().min(1)).optional(),
	/** Optional derivation rule map that computes role membership from principal context at runtime. Shape is deferred to the section compiler. */
	derive: z.record(z.string(), z.unknown()).optional(),
});

/**
 * `access` section authoring contract.
 */
export const accessSectionSchema = strictObjectWithExtensions({
	/** Baseline access policy applied to any entrypoint that does not match a more-specific access rule. `allow` opens all entrypoints by default; `deny` closes them. */
	default_policy: z.enum(["allow", "deny"]),
	/** Named role definitions keyed by role ID. Each role optionally declares inheritance and runtime derivation rules. */
	roles: z.record(z.string(), roleSchema),
});

/**
 * Parsed `access` section type.
 */
export type AccessSection = z.infer<typeof accessSectionSchema>;
