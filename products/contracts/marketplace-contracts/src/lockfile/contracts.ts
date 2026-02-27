import { z } from "zod";
import { hexHashSchema, providerIntegritySchema } from "../shared/hashes";
import { semverSchema } from "../shared/semver";

/**
 * Lock entry proving a provider can satisfy one capability contract hash.
 */
export const lockedCapabilitySchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
	contractHash: hexHashSchema,
});

/**
 * Locked capability contract entry.
 */
export type LockedCapability = z.infer<typeof lockedCapabilitySchema>;

/**
 * One locked provider version and its capability hashes.
 */
export const lockedProviderSchema = z.object({
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	integrity: providerIntegritySchema,
	capabilities: z.array(lockedCapabilitySchema).min(1),
});

/**
 * Locked provider metadata entry.
 */
export type LockedProvider = z.infer<typeof lockedProviderSchema>;

/**
 * Deterministic lockfile artifact for resolved deployment providers.
 */
export const deploymentLockfileSchema = z.object({
	appId: z.string().min(1),
	environment: z.string().min(1),
	hostApiVersion: semverSchema,
	providers: z.array(lockedProviderSchema).min(1),
});

/**
 * Deployment provider lockfile.
 */
export type DeploymentLockfile = z.infer<typeof deploymentLockfileSchema>;
