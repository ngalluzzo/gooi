/**
 * Structured host port error payload.
 */
export interface HostPortError {
	/** Stable host error code. */
	readonly code: string;
	/** Human-readable error message. */
	readonly message: string;
	/** Optional structured error details. */
	readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Result type used by host ports.
 */
export type HostPortResult<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: HostPortError };

/**
 * Host clock contract.
 */
export interface HostClockPort {
	/** Returns the current timestamp in ISO-8601 format. */
	readonly nowIso: () => string;
}

/**
 * Host identity contract.
 */
export interface HostIdentityPort {
	/** Creates a trace identifier. */
	readonly newTraceId: () => string;
	/** Creates an invocation identifier. */
	readonly newInvocationId: () => string;
}

/**
 * Host activation policy contract.
 */
export interface HostActivationPolicyPort {
	/** Validates host API alignment between runtime and deployment artifacts. */
	readonly assertHostVersionAligned: (input: {
		readonly runtimeHostApiVersion: string;
		readonly bindingPlanHostApiVersion: string;
		readonly lockfileHostApiVersion: string;
	}) => HostPortResult<void>;
}

/**
 * Host module loading contract.
 */
export interface HostModuleLoaderPort<TModule = unknown> {
	/** Loads a runtime module by specifier. */
	readonly loadModule: (specifier: string) => Promise<TModule>;
}

/**
 * Creates a successful host-port result.
 *
 * @param value - Result payload.
 * @returns Successful host-port result.
 */
export const hostOk = <T>(value: T): HostPortResult<T> => ({ ok: true, value });

/**
 * Creates a failed host-port result.
 *
 * @param code - Stable host error code.
 * @param message - Human-readable error message.
 * @param details - Optional structured details.
 * @returns Failed host-port result.
 */
export const hostFail = (
	code: string,
	message: string,
	details?: Readonly<Record<string, unknown>>,
): HostPortResult<never> => ({
	ok: false,
	error: details === undefined ? { code, message } : { code, message, details },
});

/**
 * Creates a clock port backed by the system clock.
 *
 * @returns Host clock port implementation.
 */
export const createSystemClockPort = (): HostClockPort => ({
	nowIso: () => new Date().toISOString(),
});

/**
 * Input payload for system identity port configuration.
 */
export interface CreateSystemIdentityPortInput {
	/** Prefix applied to generated trace ids. */
	readonly tracePrefix?: string;
	/** Prefix applied to generated invocation ids. */
	readonly invocationPrefix?: string;
}

/**
 * Creates an identity port backed by runtime UUID generation.
 *
 * @param input - Optional id prefix overrides.
 * @returns Host identity port implementation.
 */
export const createSystemIdentityPort = (
	input?: CreateSystemIdentityPortInput,
): HostIdentityPort => {
	const tracePrefix = input?.tracePrefix ?? "trace_";
	const invocationPrefix = input?.invocationPrefix ?? "inv_";
	return {
		newTraceId: () => `${tracePrefix}${crypto.randomUUID()}`,
		newInvocationId: () => `${invocationPrefix}${crypto.randomUUID()}`,
	};
};

/**
 * Creates an activation policy port that requires exact host API equality.
 *
 * @returns Host activation policy port implementation.
 */
export const createStrictActivationPolicyPort =
	(): HostActivationPolicyPort => ({
		assertHostVersionAligned: (input) => {
			if (
				input.runtimeHostApiVersion !== input.bindingPlanHostApiVersion ||
				input.runtimeHostApiVersion !== input.lockfileHostApiVersion
			) {
				return hostFail(
					"artifact_alignment_error",
					"Runtime host API version is not aligned with deployment artifacts.",
					{
						runtimeHostApiVersion: input.runtimeHostApiVersion,
						bindingPlanHostApiVersion: input.bindingPlanHostApiVersion,
						lockfileHostApiVersion: input.lockfileHostApiVersion,
					},
				);
			}

			return hostOk(undefined);
		},
	});
