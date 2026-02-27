import type { CapabilityBindingResolution } from "../reachability/contracts";
import type { BindingPlan, CapabilityBinding } from "./contracts";

/**
 * Locates the binding entry for a capability reference.
 *
 * @param plan - Parsed binding plan.
 * @param portId - Capability port id.
 * @param portVersion - Capability port semver.
 * @returns Matching binding, if present.
 *
 * @example
 * const binding = getCapabilityBinding(plan, "ids.generate", "1.0.0");
 */
export const getCapabilityBinding = (
	plan: BindingPlan,
	portId: string,
	portVersion: string,
): CapabilityBinding | null =>
	plan.capabilityBindings.find(
		(binding) =>
			binding.portId === portId && binding.portVersion === portVersion,
	) ?? null;

/**
 * Locates the reachability resolution for one capability reference.
 *
 * @param plan - Parsed binding plan.
 * @param portId - Capability port id.
 * @param portVersion - Capability port semver.
 * @returns Reachability classification, if present.
 *
 * @example
 * const resolution = getCapabilityBindingResolution(plan, "ids.generate", "1.0.0");
 */
export const getCapabilityBindingResolution = (
	plan: BindingPlan,
	portId: string,
	portVersion: string,
): CapabilityBindingResolution | null =>
	getCapabilityBinding(plan, portId, portVersion)?.resolution ?? null;
