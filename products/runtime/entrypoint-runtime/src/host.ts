import { createSystemClockPort } from "@gooi/host-contracts/clock";
import { createFailingCapabilityDelegationPort } from "@gooi/host-contracts/delegation";
import { createSystemIdentityPort } from "@gooi/host-contracts/identity";
import {
	getMissingHostPortSetMembers as getMissingHostPortSetMembersFromContracts,
	type HostPortContractIssue as SharedHostPortContractIssue,
	type HostPortSet as SharedHostPortSet,
} from "@gooi/host-contracts/portset";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import {
	createHostPrincipalPort,
	principalContextSchema,
} from "@gooi/host-contracts/principal";
import type { HostPortResult } from "@gooi/host-contracts/result";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import type { ResultEnvelope } from "@gooi/surface-contracts/result-envelope";

/**
 * Host adapter kit consumed by runtime orchestration.
 */
export type HostPortSet = SharedHostPortSet<
	PrincipalContext,
	ResultEnvelope<unknown, unknown>
>;

const principalValidation = principalContextSchema.safeParse;

/**
 * Missing host-port contract member descriptor.
 */
export type HostPortContractIssue = SharedHostPortContractIssue;

/**
 * Returns required host-port members that are missing or invalid.
 */
export const getMissingHostPortSetMembers = (
	hostPorts: unknown,
): readonly HostPortContractIssue[] =>
	getMissingHostPortSetMembersFromContracts(hostPorts);

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
	}),
	capabilityDelegation: createFailingCapabilityDelegationPort(),
});
