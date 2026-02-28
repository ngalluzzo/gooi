import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { asRecord, asTrimmedString } from "./ingress-record";
import type { SurfaceAdapter, SurfaceAdapterNormalizeResult } from "./registry";
import { adapterTransportError } from "./transport-error";

const normalizeHttpPayload = (
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

export const httpSurfaceAdapter: SurfaceAdapter = {
	surfaceType: "http",
	normalize: (ingress): SurfaceAdapterNormalizeResult => {
		const record = asRecord(ingress);
		if (record === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message: "HTTP ingress must be an object record.",
				}),
			};
		}

		const method = asTrimmedString(record.method);
		const path = asTrimmedString(record.path);
		if (method === undefined || path === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message: "HTTP ingress requires non-empty method and path.",
					details: {
						methodPresent: method !== undefined,
						pathPresent: path !== undefined,
					},
				}),
			};
		}

		return {
			ok: true,
			value: {
				surfaceType: "http",
				attributes: {
					method: method.toUpperCase(),
					path,
				},
				payload: normalizeHttpPayload(record),
			},
		};
	},
};
