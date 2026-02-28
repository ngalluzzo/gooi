import type { DispatchRequest } from "@gooi/surface-contracts/dispatch";
import { asRecord } from "./ingress-record";
import { adapterTransportError } from "./transport-error";

interface SurfaceAuthContext {
	readonly principal?: DispatchRequest["principal"];
	readonly authContext?: DispatchRequest["authContext"];
}

type SurfaceAuthContextResult =
	| {
			readonly ok: true;
			readonly value: SurfaceAuthContext;
	  }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof adapterTransportError>;
	  };

export const resolveSurfaceAuthContext = (
	ingress: Readonly<Record<string, unknown>>,
): SurfaceAuthContextResult => {
	const principalCandidate = ingress.principal;
	if (
		principalCandidate !== undefined &&
		asRecord(principalCandidate) === undefined
	) {
		return {
			ok: false,
			error: adapterTransportError({
				message: "Surface ingress principal must be an object when provided.",
			}),
		};
	}

	const authCandidate = ingress.authContext ?? ingress.auth;
	if (authCandidate !== undefined && asRecord(authCandidate) === undefined) {
		return {
			ok: false,
			error: adapterTransportError({
				message:
					"Surface ingress authContext/auth must be an object when provided.",
			}),
		};
	}

	return {
		ok: true,
		value: {
			...(asRecord(principalCandidate) === undefined
				? {}
				: {
						principal: asRecord(
							principalCandidate,
						) as DispatchRequest["principal"],
					}),
			...(asRecord(authCandidate) === undefined
				? {}
				: {
						authContext: asRecord(
							authCandidate,
						) as DispatchRequest["authContext"],
					}),
		},
	};
};
