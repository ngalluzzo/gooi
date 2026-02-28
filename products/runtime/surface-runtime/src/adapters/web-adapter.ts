import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { resolveSurfaceAuthContext } from "./auth-context";
import { asRecord, asTrimmedString } from "./ingress-record";
import { resolveSurfaceInvocationHost } from "./invocation-host";
import type { SurfaceAdapter, SurfaceAdapterNormalizeResult } from "./registry";
import { adapterTransportError } from "./transport-error";

const normalizeWebPayload = (
	ingress: Readonly<Record<string, unknown>>,
): SurfaceRequestPayload => ({
	...(asRecord(ingress.pathParams) === undefined
		? {}
		: { path: asRecord(ingress.pathParams) }),
	...(asRecord(ingress.query) === undefined
		? {}
		: { query: asRecord(ingress.query) }),
	...(asRecord(ingress.body) === undefined
		? {}
		: { body: asRecord(ingress.body) }),
	...(asRecord(ingress.args) === undefined
		? {}
		: { args: asRecord(ingress.args) }),
	...(asRecord(ingress.flags) === undefined
		? {}
		: { flags: asRecord(ingress.flags) }),
});

export const webSurfaceAdapter: SurfaceAdapter = {
	surfaceType: "web",
	normalize: (ingress): SurfaceAdapterNormalizeResult => {
		const record = asRecord(ingress);
		if (record === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message: "Web ingress must be an object record.",
				}),
			};
		}

		const routeId = asTrimmedString(record.routeId);
		const path = asTrimmedString(record.path);
		if (routeId === undefined && path === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message: "Web ingress requires at least one of routeId or path.",
				}),
			};
		}
		const authContext = resolveSurfaceAuthContext(record);
		if (!authContext.ok) {
			return {
				ok: false,
				error: authContext.error,
			};
		}
		const invocationHost = resolveSurfaceInvocationHost({
			ingress: record,
			defaultInvocationHost: "browser",
		});
		if (!invocationHost.ok) {
			return {
				ok: false,
				error: invocationHost.error,
			};
		}

		return {
			ok: true,
			value: {
				surfaceType: "web",
				invocationHost: invocationHost.value,
				attributes: {
					...(routeId === undefined ? {} : { routeId }),
					...(path === undefined ? {} : { path }),
				},
				payload: normalizeWebPayload(record),
				...authContext.value,
			},
		};
	},
};
