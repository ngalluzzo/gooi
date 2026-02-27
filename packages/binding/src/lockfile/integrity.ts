import { providerIntegrityPattern } from "../shared/hashes";

/**
 * Validates locked provider integrity string format.
 *
 * @param integrity - Lockfile integrity value.
 * @returns True when integrity is `sha256:<64-hex>`.
 *
 * @example
 * const valid = isLockedProviderIntegrity("sha256:0123...");
 */
export const isLockedProviderIntegrity = (integrity: string): boolean =>
	providerIntegrityPattern.test(integrity);
