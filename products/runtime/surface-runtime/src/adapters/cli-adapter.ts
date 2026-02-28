import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { resolveSurfaceAuthContext } from "./auth-context";
import { asRecord, asString, asTrimmedString } from "./ingress-record";
import { resolveSurfaceInvocationHost } from "./invocation-host";
import type { SurfaceAdapter, SurfaceAdapterNormalizeResult } from "./registry";
import { adapterTransportError } from "./transport-error";

const resolveCommandPath = (value: unknown): string | undefined => {
	if (Array.isArray(value)) {
		const parts = value
			.map((item) => asTrimmedString(item))
			.filter((item): item is string => item !== undefined);
		const joined = parts.join(" ").trim();
		return joined.length === 0 ? undefined : joined;
	}
	return asTrimmedString(value);
};

const normalizeCliPayload = (
	ingress: Readonly<Record<string, unknown>>,
): SurfaceRequestPayload => ({
	...(asRecord(ingress.args) === undefined
		? {}
		: { args: asRecord(ingress.args) }),
	...(asRecord(ingress.flags) === undefined
		? {}
		: { flags: asRecord(ingress.flags) }),
});

const normalizeFlagAttributes = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined => {
	const flags = asRecord(value);
	if (flags === undefined) {
		return undefined;
	}
	const normalized: Record<string, unknown> = {};
	for (const [key, rawValue] of Object.entries(flags)) {
		if (typeof rawValue === "string") {
			normalized[key] = asString(rawValue)?.trim() ?? rawValue;
			continue;
		}
		normalized[key] = rawValue;
	}
	return normalized;
};

export const cliSurfaceAdapter: SurfaceAdapter = {
	surfaceType: "cli",
	normalize: (ingress): SurfaceAdapterNormalizeResult => {
		const record = asRecord(ingress);
		if (record === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message: "CLI ingress must be an object record.",
				}),
			};
		}

		const commandPath = resolveCommandPath(
			record.command ?? record.commandPath,
		);
		if (commandPath === undefined) {
			return {
				ok: false,
				error: adapterTransportError({
					message:
						"CLI ingress requires command or commandPath as a non-empty string.",
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
				surfaceType: "cli",
				invocationHost: invocationHost.value,
				attributes: {
					command: { path: commandPath },
					...(normalizeFlagAttributes(record.flags) === undefined
						? {}
						: { flags: normalizeFlagAttributes(record.flags) }),
				},
				payload: normalizeCliPayload(record),
				...authContext.value,
			},
		};
	},
};
