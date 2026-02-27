import type { DeploymentLockfile, LockedProvider } from "./contracts";

/**
 * Locates a provider lock entry by provider id and version.
 *
 * @param lockfile - Parsed lockfile.
 * @param providerId - Provider identity.
 * @param providerVersion - Provider semver.
 * @returns Matching lock entry, if present.
 *
 * @example
 * const provider = getLockedProvider(lockfile, "gooi.providers.memory", "1.2.3");
 */
export const getLockedProvider = (
	lockfile: DeploymentLockfile,
	providerId: string,
	providerVersion: string,
): LockedProvider | null =>
	lockfile.providers.find(
		(provider) =>
			provider.providerId === providerId &&
			provider.providerVersion === providerVersion,
	) ?? null;

/**
 * Checks whether a lock entry contains an exact capability contract hash.
 *
 * @param provider - Locked provider entry.
 * @param portId - Capability port id.
 * @param portVersion - Capability semver.
 * @param contractHash - Expected capability contract hash.
 * @returns True when lock entry is present and hash matches.
 *
 * @example
 * const matches = providerHasLockedCapability(provider, "ids.generate", "1.0.0", hash);
 */
export const providerHasLockedCapability = (
	provider: LockedProvider,
	portId: string,
	portVersion: string,
	contractHash: string,
): boolean =>
	provider.capabilities.some(
		(capability) =>
			capability.portId === portId &&
			capability.portVersion === portVersion &&
			capability.contractHash === contractHash,
	);
