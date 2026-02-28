import type { DispatchRequest } from "@gooi/surface-contracts/dispatch";

export const pickDispatchAuthContext = (
	request: DispatchRequest,
): {
	readonly principal?: DispatchRequest["principal"];
	readonly authContext?: DispatchRequest["authContext"];
} => ({
	...(request.principal === undefined ? {} : { principal: request.principal }),
	...(request.authContext === undefined
		? {}
		: { authContext: request.authContext }),
});
