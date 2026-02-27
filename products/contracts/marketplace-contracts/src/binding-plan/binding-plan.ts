import { areBindingArtifactsAligned as areArtifactsAligned } from "../artifact-alignment/policy";
import {
	type DeploymentLockfile,
	deploymentLockfileSchema,
	type LockedCapability,
	type LockedProvider,
	lockedCapabilitySchema,
	lockedProviderSchema,
} from "../lockfile/contracts";
import { isLockedProviderIntegrity as isLockedProviderIntegrityValue } from "../lockfile/integrity";
import {
	getLockedProvider as getLockedProviderFromLockfile,
	providerHasLockedCapability as providerHasLockedCapabilityInLockfile,
} from "../lockfile/lookup";
import { parseDeploymentLockfile as parseLockfileArtifact } from "../lockfile/parse";
import {
	type CapabilityBindingResolution,
	type CapabilityReachabilityMode,
	capabilityBindingResolutionSchema,
	capabilityReachabilityModeSchema,
	delegatedCapabilityBindingResolutionSchema,
	type ExecutionHost,
	executionHostSchema,
	localCapabilityBindingResolutionSchema,
	unreachableCapabilityBindingResolutionSchema,
} from "../reachability/contracts";
import { isCapabilityReachable as isReachable } from "../reachability/policy";
import {
	type BindingPlan,
	bindingPlanSchema,
	type CapabilityBinding,
	capabilityBindingSchema,
} from "./contracts";
import {
	getCapabilityBinding as getCapabilityBindingFromPlan,
	getCapabilityBindingResolution as getCapabilityBindingResolutionFromPlan,
} from "./lookup";
import { parseBindingPlan as parseBindingPlanArtifact } from "./parse";

export {
	executionHostSchema,
	capabilityReachabilityModeSchema,
	localCapabilityBindingResolutionSchema,
	delegatedCapabilityBindingResolutionSchema,
	unreachableCapabilityBindingResolutionSchema,
	capabilityBindingResolutionSchema,
	capabilityBindingSchema,
	bindingPlanSchema,
	lockedCapabilitySchema,
	lockedProviderSchema,
	deploymentLockfileSchema,
};

/**
 * Required capability binding model with reachability classification.
 */
export type { CapabilityBinding };

/**
 * One required capability reachability classification.
 */
export type { CapabilityBindingResolution };

/**
 * Supported execution host value in binding artifacts.
 */
export type { ExecutionHost };

/**
 * Reachability mode for required capability bindings.
 */
export type { CapabilityReachabilityMode };

/**
 * Resolved capability binding plan.
 */
export type { BindingPlan };

/**
 * Locked capability contract entry.
 */
export type { LockedCapability };

/**
 * Locked provider metadata entry.
 */
export type { LockedProvider };

/**
 * Deployment provider lockfile.
 */
export type { DeploymentLockfile };

/**
 * Validates and parses a binding plan artifact.
 */
export const parseBindingPlan = (value: unknown): BindingPlan =>
	parseBindingPlanArtifact(value);

/**
 * Validates and parses a deployment lockfile artifact.
 */
export const parseDeploymentLockfile = (value: unknown): DeploymentLockfile =>
	parseLockfileArtifact(value);

/**
 * Locates the binding entry for a capability reference.
 */
export const getCapabilityBinding = (
	plan: BindingPlan,
	portId: string,
	portVersion: string,
): CapabilityBinding | null =>
	getCapabilityBindingFromPlan(plan, portId, portVersion);

/**
 * Locates the reachability resolution for one capability reference.
 */
export const getCapabilityBindingResolution = (
	plan: BindingPlan,
	portId: string,
	portVersion: string,
): CapabilityBindingResolution | null =>
	getCapabilityBindingResolutionFromPlan(plan, portId, portVersion);

/**
 * Returns true when the capability is classified as reachable (`local` or `delegated`).
 */
export const isCapabilityReachable = (
	resolution: CapabilityBindingResolution,
): boolean => isReachable(resolution);

/**
 * Locates a provider lock entry by provider id and version.
 */
export const getLockedProvider = (
	lockfile: DeploymentLockfile,
	providerId: string,
	providerVersion: string,
): LockedProvider | null =>
	getLockedProviderFromLockfile(lockfile, providerId, providerVersion);

/**
 * Checks whether a lock entry contains an exact capability contract hash.
 */
export const providerHasLockedCapability = (
	provider: LockedProvider,
	portId: string,
	portVersion: string,
	contractHash: string,
): boolean =>
	providerHasLockedCapabilityInLockfile(
		provider,
		portId,
		portVersion,
		contractHash,
	);

/**
 * Validates locked provider integrity string format.
 */
export const isLockedProviderIntegrity = (integrity: string): boolean =>
	isLockedProviderIntegrityValue(integrity);

/**
 * Validates that binding plan and lockfile refer to the same deployment scope.
 */
export const areBindingArtifactsAligned = (
	plan: BindingPlan,
	lockfile: DeploymentLockfile,
): boolean => areArtifactsAligned(plan, lockfile);
