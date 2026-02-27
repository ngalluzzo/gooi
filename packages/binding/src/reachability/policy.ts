import type { CapabilityBindingResolution } from "./contracts";

/**
 * Returns true when the capability is classified as reachable (`local` or `delegated`).
 *
 * @param resolution - Binding reachability classification.
 * @returns Whether the capability can be invoked.
 *
 * @example
 * const reachable = isCapabilityReachable(resolution);
 */
export const isCapabilityReachable = (
	resolution: CapabilityBindingResolution,
): boolean => resolution.mode !== "unreachable";
