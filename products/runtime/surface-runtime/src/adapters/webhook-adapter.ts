import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { asRecord, asTrimmedString } from "./ingress-record";
import type { SurfaceAdapter, SurfaceAdapterNormalizeResult } from "./registry";
import { adapterTransportError } from "./transport-error";

const normalizeWebhookPayload = (
	ingress: Readonly<Record<string, unknown>>,
): SurfaceRequestPayload => ({
	...(asRecord(ingress.query) === undefined
		? {}
		: { query: asRecord(ingress.query) }),
	...(asRecord(ingress.body) === undefined
		? {}
		: { body: asRecord(ingress.body) }),
});

export const webhookSurfaceAdapter: SurfaceAdapter = {
	surfaceType: "webhook",
	normalize: (ingress): SurfaceAdapterNormalizeResult => {
		const record = asRecord(ingress);
		if (record === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message: "Webhook ingress must be an object record.",
				}),
			};
		}

		if (record.verified === false) {
			return {
				ok: false,
				error: adapterTransportError({
					message: "Webhook ingress failed verification before dispatch.",
					details: { reason: "verification_failed" },
				}),
			};
		}

		const sourceId = asTrimmedString(record.sourceId);
		const method = asTrimmedString(record.method);
		const path = asTrimmedString(record.path);
		if (sourceId === undefined || method === undefined || path === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message:
						"Webhook ingress requires non-empty sourceId, method, and path.",
					details: {
						sourceIdPresent: sourceId !== undefined,
						methodPresent: method !== undefined,
						pathPresent: path !== undefined,
					},
				}),
			};
		}

		return {
			ok: true,
			value: {
				surfaceType: "webhook",
				attributes: {
					sourceId,
					method: method.toUpperCase(),
					path,
				},
				payload: normalizeWebhookPayload(record),
			},
		};
	},
};
