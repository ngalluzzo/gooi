import type { DispatchError } from "@gooi/surface-contracts/dispatch";

export const adapterTransportError = (input: {
	readonly message: string;
	readonly details?: Readonly<Record<string, unknown>>;
}): DispatchError => ({
	code: "dispatch_transport_error",
	message: input.message,
	...(input.details === undefined ? {} : { details: input.details }),
});
