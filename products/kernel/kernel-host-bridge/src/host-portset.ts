export interface KernelHostPortSet {
	readonly clock: {
		readonly nowIso: () => string;
	};
	readonly identity: {
		readonly newTraceId: () => string;
		readonly newInvocationId: () => string;
	};
	readonly principal: {
		readonly validatePrincipal: (value: unknown) => unknown;
		readonly deriveRoles: (input: {
			readonly principal: unknown;
			readonly accessPlan: unknown;
		}) => unknown;
	};
	readonly capabilityDelegation: {
		readonly invokeDelegated: (input: unknown) => Promise<unknown>;
	};
	readonly replay?: {
		readonly load: (scopeKey: string) => Promise<unknown>;
		readonly save: (input: unknown) => Promise<void>;
	};
}

export type KernelHostPortSetInput = unknown;

export interface HostPortContractIssue {
	readonly path: string;
	readonly expected: "function";
}

export interface KernelHostPortSetValidationDetails
	extends Readonly<Record<string, unknown>> {
	readonly code: "host_port_missing";
	readonly missingHostPortMembers: readonly HostPortContractIssue[];
}

export class KernelHostPortSetValidationError extends Error {
	readonly code = "host_port_missing" as const;
	readonly details: KernelHostPortSetValidationDetails;

	constructor(missingHostPortMembers: readonly HostPortContractIssue[]) {
		super("Host port set is missing required members.");
		this.name = "KernelHostPortSetValidationError";
		this.details = {
			code: "host_port_missing",
			missingHostPortMembers,
		};
	}
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

export const getMissingKernelHostPortSetMembers = (
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

export const parseKernelHostPortSet = (
	input: KernelHostPortSetInput,
): KernelHostPortSet => {
	const missingHostPortMembers = getMissingKernelHostPortSetMembers(input);
	if (missingHostPortMembers.length > 0) {
		throw new KernelHostPortSetValidationError(missingHostPortMembers);
	}

	return input as KernelHostPortSet;
};
