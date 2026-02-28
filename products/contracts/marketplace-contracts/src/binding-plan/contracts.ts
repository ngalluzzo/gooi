/**
 * Canonical boundary contract API.
 */
import { z } from "zod";
import { areBindingArtifactsAligned } from "../artifact-alignment/policy";
import {
	deploymentLockfileSchema,
	lockedCapabilitySchema,
	lockedProviderSchema,
} from "../lockfile/contracts";
import * as lockfile_integrity from "../lockfile/integrity";
import * as lockfile_lookup from "../lockfile/lookup";
import * as lockfile_parse from "../lockfile/parse";
import {
	capabilityBindingResolutionSchema,
	delegatedCapabilityBindingResolutionSchema,
	executionHostSchema,
	localCapabilityBindingResolutionSchema,
	unreachableCapabilityBindingResolutionSchema,
} from "../reachability/contracts";
import { semverSchema } from "../shared/semver";
import { isCapabilityReachable as isCapabilityReachableFn } from "./binding-plan";
import * as lookup from "./lookup";
import { parseBindingPlan } from "./parse";

export const capabilityBindingSchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
	resolution: capabilityBindingResolutionSchema,
});

export const bindingPlanSchema = z.object({
	appId: z.string().min(1),
	environment: z.string().min(1),
	hostApiVersion: semverSchema,
	capabilityBindings: z.array(capabilityBindingSchema).min(1),
});

export type CapabilityBinding = z.infer<typeof capabilityBindingSchema>;
export type BindingPlan = z.infer<typeof bindingPlanSchema>;

export const parseBindingPlanArtifact = parseBindingPlan;

export const parseBindingArtifacts = {
	parseBindingPlan,
	parseBindingPlanArtifact,
	parseDeploymentLockfile: lockfile_parse.parseDeploymentLockfile,
};

export const bindingPlanContracts = Object.freeze({
	parseBindingPlan,
	parseBindingPlanArtifact,
	parseDeploymentLockfile: lockfile_parse.parseDeploymentLockfile,
	getCapabilityBinding: lookup.getCapabilityBinding,
	getCapabilityBindingResolution: lookup.getCapabilityBindingResolution,
	isCapabilityReachable: isCapabilityReachableFn,
	getLockedProvider: lockfile_lookup.getLockedProvider,
	providerHasLockedCapability: lockfile_lookup.providerHasLockedCapability,
	isLockedProviderIntegrity: lockfile_integrity.isLockedProviderIntegrity,
	areBindingArtifactsAligned,
	capabilityBindingSchema,
	bindingPlanSchema,
	capabilityBindingResolutionSchema,
	localCapabilityBindingResolutionSchema,
	delegatedCapabilityBindingResolutionSchema,
	unreachableCapabilityBindingResolutionSchema,
	executionHostSchema,
	deploymentLockfileSchema,
	lockedCapabilitySchema,
	lockedProviderSchema,
});

export type {
	DeploymentLockfile,
	LockedCapability,
	LockedProvider,
} from "../lockfile/contracts";
export type {
	CapabilityBindingResolution,
	CapabilityReachabilityMode,
	ExecutionHost,
} from "../reachability/contracts";
