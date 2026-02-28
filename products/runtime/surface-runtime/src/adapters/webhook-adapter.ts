import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { resolveSurfaceAuthContext } from "./auth-context";
import { asRecord, asTrimmedString } from "./ingress-record";
import { resolveSurfaceInvocationHost } from "./invocation-host";
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
		const authContext = resolveSurfaceAuthContext(record);
		if (!authContext.ok) {
			return {
				ok: false,
				error: authContext.error,
			};
		}
		const invocationHost = resolveSurfaceInvocationHost({
			ingress: record,
			defaultInvocationHost: "node",
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
				surfaceType: "webhook",
				invocationHost: invocationHost.value,
				attributes: {
					sourceId,
					method: method.toUpperCase(),
					path,
				},
				payload: normalizeWebhookPayload(record),
				...authContext.value,
			},
		};
	},
};
