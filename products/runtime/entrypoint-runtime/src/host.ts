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
