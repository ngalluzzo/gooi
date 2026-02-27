import type { HostClockPort } from "@gooi/host-contracts/clock";
import { createSystemClockPort } from "@gooi/host-contracts/clock";
import {
	createFailingCapabilityDelegationPort,
	type HostCapabilityDelegationPort,
} from "@gooi/host-contracts/delegation";
import type { HostIdentityPort } from "@gooi/host-contracts/identity";
import { createSystemIdentityPort } from "@gooi/host-contracts/identity";
import type {
	HostPrincipalPort,
	PrincipalContext,
} from "@gooi/host-contracts/principal";
import {
	createHostPrincipalPort,
	principalContextSchema,
} from "@gooi/host-contracts/principal";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";
import type { HostPortResult } from "@gooi/host-contracts/result";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import type { CompiledAccessPlan } from "@gooi/spec-compiler/contracts";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";
import { deriveEffectiveRoles } from "./access-policy/access-policy";

/**
 * Host adapter kit consumed by runtime orchestration.
 */
export interface HostPortSet {
	/** Clock port used for invocation lifecycle timing. */
	readonly clock: HostClockPort;
	/** Identity port used for trace and invocation identifiers. */
	readonly identity: HostIdentityPort;
	/** Principal policy port used for policy gate evaluation. */
	readonly principal: HostPrincipalPort<PrincipalContext, CompiledAccessPlan>;
	/** Capability delegation port used for cross-host capability invocation routes. */
	readonly capabilityDelegation: HostCapabilityDelegationPort;
	/** Optional replay store for replay and conflict semantics. */
	readonly replay?: HostReplayStorePort<ResultEnvelope<unknown, unknown>>;
}

const principalValidation = principalContextSchema.safeParse;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

/**
 * Missing host-port contract member descriptor.
 */
export interface HostPortContractIssue {
	/** Dot-path for the missing or invalid host-port member. */
	readonly path: string;
	/** Expected member shape. */
	readonly expected: "function";
}

/**
 * Returns required host-port members that are missing or invalid.
 */
export const getMissingHostPortSetMembers = (
	hostPorts: unknown,
): readonly HostPortContractIssue[] => {
	const record = isRecord(hostPorts) ? hostPorts : {};
	const issues: HostPortContractIssue[] = [];
	const requiredMembers = [
		{
			path: "clock.nowIso",
			valid: () =>
				isRecord(record.clock) && typeof record.clock.nowIso === "function",
		},
		{
			path: "identity.newTraceId",
			valid: () =>
				isRecord(record.identity) &&
				typeof record.identity.newTraceId === "function",
		},
		{
			path: "identity.newInvocationId",
			valid: () =>
				isRecord(record.identity) &&
				typeof record.identity.newInvocationId === "function",
		},
		{
			path: "principal.validatePrincipal",
			valid: () =>
				isRecord(record.principal) &&
				typeof record.principal.validatePrincipal === "function",
		},
		{
			path: "principal.deriveRoles",
			valid: () =>
				isRecord(record.principal) &&
				typeof record.principal.deriveRoles === "function",
		},
		{
			path: "capabilityDelegation.invokeDelegated",
			valid: () =>
				isRecord(record.capabilityDelegation) &&
				typeof record.capabilityDelegation.invokeDelegated === "function",
		},
	] as const;

	for (const member of requiredMembers) {
		if (!member.valid()) {
			issues.push({
				path: member.path,
				expected: "function",
			});
		}
	}

	if (record.replay !== undefined) {
		if (!isRecord(record.replay) || typeof record.replay.load !== "function") {
			issues.push({
				path: "replay.load",
				expected: "function",
			});
		}
		if (!isRecord(record.replay) || typeof record.replay.save !== "function") {
			issues.push({
				path: "replay.save",
				expected: "function",
			});
		}
	}

	return issues;
};

/**
 * Creates host ports for runtime orchestration.
 */
export const createDefaultHostPorts = (): HostPortSet => ({
	clock: createSystemClockPort(),
	identity: createSystemIdentityPort(),
	principal: createHostPrincipalPort({
		validatePrincipal: (value): HostPortResult<PrincipalContext> => {
			const parsed = principalValidation(value);
			if (!parsed.success) {
				return hostFail(
					"principal_validation_error",
					"Invalid principal context.",
					{
						issues: parsed.error.issues,
					},
				);
			}
			return hostOk(parsed.data);
		},
		deriveRoles: ({ principal, accessPlan }) =>
			hostOk(deriveEffectiveRoles(principal, accessPlan)),
	}),
	capabilityDelegation: createFailingCapabilityDelegationPort(),
});
