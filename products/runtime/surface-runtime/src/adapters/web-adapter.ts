import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { asRecord, asTrimmedString } from "./ingress-record";
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

		return {
			ok: true,
			value: {
				surfaceType: "web",
				attributes: {
					...(routeId === undefined ? {} : { routeId }),
					...(path === undefined ? {} : { path }),
				},
				payload: normalizeWebPayload(record),
			},
		};
	},
};
