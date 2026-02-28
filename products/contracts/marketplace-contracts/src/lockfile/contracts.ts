/**
 * Canonical boundary contract API.
 */
import { z } from "zod";
import { hexHashSchema, providerIntegritySchema } from "../shared/hashes";
import { semverSchema } from "../shared/semver";
import * as integrity from "./integrity";
import * as lookup from "./lookup";
import * as parse from "./parse";

export const lockedCapabilitySchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
	contractHash: hexHashSchema,
});

export type LockedCapability = z.infer<typeof lockedCapabilitySchema>;

export const lockedProviderSchema = z.object({
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	integrity: providerIntegritySchema,
	capabilities: z.array(lockedCapabilitySchema).min(1),
});

export type LockedProvider = z.infer<typeof lockedProviderSchema>;

export const deploymentLockfileSchema = z.object({
	appId: z.string().min(1),
	environment: z.string().min(1),
	hostApiVersion: semverSchema,
	providers: z.array(lockedProviderSchema).min(1),
});

export type DeploymentLockfile = z.infer<typeof deploymentLockfileSchema>;

export const lockfileContracts = Object.freeze({
	lockedCapabilitySchema,
	lockedProviderSchema,
	deploymentLockfileSchema,
	isLockedProviderIntegrity: integrity.isLockedProviderIntegrity,
	getLockedProvider: lookup.getLockedProvider,
	providerHasLockedCapability: lookup.providerHasLockedCapability,
	parseDeploymentLockfile: parse.parseDeploymentLockfile,
});

export { integrity, lookup, parse };
