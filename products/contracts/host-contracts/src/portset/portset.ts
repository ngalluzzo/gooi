import type { HostClockPort } from "../clock/clock";
import type { HostCapabilityDelegationPort } from "../delegation/delegation";
import type { HostIdentityPort } from "../identity/identity";
import type {
	HostPrincipalPort,
	PrincipalContext,
} from "../principal/principal";
import type { HostReplayStorePort } from "../replay/replay";

export interface HostPortSet<
	TPrincipalContext = PrincipalContext,
	TReplayResult = unknown,
> {
	readonly clock: HostClockPort;
	readonly identity: HostIdentityPort;
	readonly principal: HostPrincipalPort<TPrincipalContext>;
	readonly capabilityDelegation: HostCapabilityDelegationPort;
	readonly replay?: HostReplayStorePort<TReplayResult>;
}

export type HostPortSetInput = unknown;

export interface HostPortContractIssue {
	readonly path: string;
	readonly expected: "function";
}

export interface HostPortSetValidationDetails
	extends Readonly<Record<string, unknown>> {
	readonly code: "host_port_missing";
	readonly missingHostPortMembers: readonly HostPortContractIssue[];
}

export class HostPortSetValidationError extends Error {
	readonly code = "host_port_missing" as const;
	readonly details: HostPortSetValidationDetails;

	constructor(missingHostPortMembers: readonly HostPortContractIssue[]) {
		super("Host port set is missing required members.");
		this.name = "HostPortSetValidationError";
		this.details = {
			code: "host_port_missing",
			missingHostPortMembers,
		};
	}
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

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

export const parseHostPortSet = <
	TPrincipalContext = PrincipalContext,
	TReplayResult = unknown,
>(
	input: HostPortSetInput,
): HostPortSet<TPrincipalContext, TReplayResult> => {
	const missingHostPortMembers = getMissingHostPortSetMembers(input);
	if (missingHostPortMembers.length > 0) {
		throw new HostPortSetValidationError(missingHostPortMembers);
	}

	return input as HostPortSet<TPrincipalContext, TReplayResult>;
};
