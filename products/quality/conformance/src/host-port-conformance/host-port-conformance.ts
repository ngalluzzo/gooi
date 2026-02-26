/**
 * Canonical conformance-check shape for host/provider feature suites.
 */
export interface HostPortConformanceCheck<TId extends string> {
	/** Stable check identifier. */
	readonly id: TId;
	/** True when the check passed. */
	readonly passed: boolean;
	/** Human-readable check detail. */
	readonly detail: string;
}

/**
 * Creates a host/provider conformance check result.
 */
export const buildHostPortConformanceCheck = <TId extends string>(
	id: TId,
	passed: boolean,
	detail: string,
): HostPortConformanceCheck<TId> => ({
	id,
	passed,
	detail,
});

/**
 * Computes aggregate pass state from check results.
 */
export const areHostPortConformanceChecksPassing = (
	checks: readonly { readonly passed: boolean }[],
): boolean => checks.every((check) => check.passed);
