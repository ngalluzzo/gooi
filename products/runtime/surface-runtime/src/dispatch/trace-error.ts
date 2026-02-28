import type {
	DispatchError,
	DispatchTraceEnvelope,
} from "@gooi/surface-contracts/dispatch";

export const buildDispatchError = (
	error: DispatchError,
	trace: Omit<DispatchTraceEnvelope, "error">,
): {
	readonly ok: false;
	readonly error: DispatchError;
	readonly trace: DispatchTraceEnvelope;
} => ({
	ok: false,
	error,
	trace: {
		...trace,
		error,
	},
});

export const dispatchTransportError = (input: {
	readonly message: string;
	readonly details?: Readonly<Record<string, unknown>>;
}): DispatchError => ({
	code: "dispatch_transport_error",
	message: input.message,
	...(input.details === undefined ? {} : { details: input.details }),
});
