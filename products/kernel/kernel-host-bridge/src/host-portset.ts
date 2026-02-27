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

export const parseKernelHostPortSet = (
	input: KernelHostPortSetInput,
): KernelHostPortSet => input as KernelHostPortSet;
