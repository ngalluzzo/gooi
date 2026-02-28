import {
	type DispatchRequest,
	parseDispatchInvocationHost,
} from "@gooi/surface-contracts/dispatch";
import { asTrimmedString } from "./ingress-record";
import { adapterTransportError } from "./transport-error";

export const resolveSurfaceInvocationHost = (input: {
	readonly ingress: Readonly<Record<string, unknown>>;
	readonly defaultInvocationHost: DispatchRequest["invocationHost"];
}):
	| {
			readonly ok: true;
			readonly value: DispatchRequest["invocationHost"];
	  }
	| {
			readonly ok: false;
			readonly error: import("@gooi/surface-contracts/dispatch").DispatchError;
	  } => {
	const candidate =
		asTrimmedString(input.ingress.invocationHost) ??
		input.defaultInvocationHost;
	try {
		return {
			ok: true,
			value: parseDispatchInvocationHost(candidate),
		};
	} catch {
		return {
			ok: false,
			error: adapterTransportError({
				message:
					"Surface ingress invocationHost must be one of browser, node, edge, worker.",
				details: {
					invocationHost: input.ingress.invocationHost,
				},
			}),
		};
	}
};
