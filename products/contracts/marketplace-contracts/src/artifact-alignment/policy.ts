import type { BindingPlan } from "../binding-plan/contracts";
import type { DeploymentLockfile } from "../lockfile/contracts";

/**
 * Validates that binding plan and lockfile refer to the same deployment scope.
 *
 * @param plan - Parsed binding plan.
 * @param lockfile - Parsed lockfile.
 * @returns True when app, environment, and host API match.
 *
 * @example
 * const aligned = areBindingArtifactsAligned(plan, lockfile);
 */
export const areBindingArtifactsAligned = (
	plan: BindingPlan,
	lockfile: DeploymentLockfile,
): boolean =>
	plan.appId === lockfile.appId &&
	plan.environment === lockfile.environment &&
	plan.hostApiVersion === lockfile.hostApiVersion;
