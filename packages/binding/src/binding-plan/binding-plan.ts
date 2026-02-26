import { z } from "zod";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});

const hexHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const executionHostSchema = z.enum([
	"browser",
	"node",
	"edge",
	"worker",
]);
export const capabilityReachabilityModeSchema = z.enum([
	"local",
	"delegated",
	"unreachable",
]);

export const localCapabilityBindingResolutionSchema = z.object({
	mode: z.literal("local"),
	targetHost: executionHostSchema,
	providerId: z.string().min(1),
});

export const delegatedCapabilityBindingResolutionSchema = z.object({
	mode: z.literal("delegated"),
	targetHost: executionHostSchema,
	providerId: z.string().min(1),
	delegateRouteId: z.string().min(1),
});

export const unreachableCapabilityBindingResolutionSchema = z.object({
	mode: z.literal("unreachable"),
	reason: z.string().min(1).optional(),
});

export const capabilityBindingResolutionSchema = z.discriminatedUnion("mode", [
	localCapabilityBindingResolutionSchema,
	delegatedCapabilityBindingResolutionSchema,
	unreachableCapabilityBindingResolutionSchema,
]);

/**
 * Binding resolution entry for one required capability port.
 */
export const capabilityBindingSchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
	resolution: capabilityBindingResolutionSchema,
});

/**
 * Required capability binding model with reachability classification.
 */
export type CapabilityBinding = z.infer<typeof capabilityBindingSchema>;

/**
 * One required capability reachability classification.
 */
export type CapabilityBindingResolution = z.infer<
	typeof capabilityBindingResolutionSchema
>;

/**
 * Supported execution host value in binding artifacts.
 */
export type ExecutionHost = z.infer<typeof executionHostSchema>;

/**
 * Reachability mode for required capability bindings.
 */
export type CapabilityReachabilityMode = z.infer<
	typeof capabilityReachabilityModeSchema
>;

/**
 * Deployment binding plan resolved for one app environment.
 */
export const bindingPlanSchema = z.object({
	appId: z.string().min(1),
	environment: z.string().min(1),
	hostApiVersion: semverSchema,
	capabilityBindings: z.array(capabilityBindingSchema).min(1),
});

/**
 * Resolved capability binding plan.
 */
export type BindingPlan = z.infer<typeof bindingPlanSchema>;

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
	integrity: z.string().min(1),
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

/**
 * Validates and parses a binding plan artifact.
 *
 * @param value - Untrusted plan input.
 * @returns Parsed binding plan.
 *
 * @example
 * const plan = parseBindingPlan(rawPlan);
 */
export const parseBindingPlan = (value: unknown): BindingPlan =>
	bindingPlanSchema.parse(value);

/**
 * Validates and parses a deployment lockfile artifact.
 *
 * @param value - Untrusted lockfile input.
 * @returns Parsed lockfile.
 *
 * @example
 * const lockfile = parseDeploymentLockfile(rawLockfile);
 */
export const parseDeploymentLockfile = (value: unknown): DeploymentLockfile =>
	deploymentLockfileSchema.parse(value);

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
