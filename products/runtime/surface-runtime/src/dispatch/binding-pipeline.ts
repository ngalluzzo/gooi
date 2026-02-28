import type {
	CompiledEntrypoint,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import type {
	DispatchError,
	DispatchRequest,
} from "@gooi/surface-contracts/dispatch";
import type { SurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { parseSurfaceRequestPayload } from "@gooi/surface-contracts/request";
import { bindSurfaceInput } from "../binding/bind-surface-input";
import { readSourceValue } from "../binding/source-path";
import type { SurfaceDispatchSelection } from "./dispatch-surface-request";
import { dispatchTransportError } from "./trace-error";

const toBindingKey = (input: {
	readonly surfaceId: string;
	readonly kind: "query" | "mutation";
	readonly entrypointId: string;
}): string => `${input.surfaceId}:${input.kind}:${input.entrypointId}`;

const parsePayloadBuckets = (
	request: DispatchRequest,
): SurfaceRequestPayload | DispatchError => {
	try {
		const payloadCandidate = request.payload ?? {};
		return parseSurfaceRequestPayload(payloadCandidate);
	} catch {
		return dispatchTransportError({
			message: "Dispatch payload failed surface request payload validation.",
			details: {
				surfaceId: request.surfaceId,
			},
		});
	}
};

const bindRoutePayload = (input: {
	readonly requestPayload: SurfaceRequestPayload;
	readonly selection: SurfaceDispatchSelection;
}): Readonly<Record<string, unknown>> => {
	const output: Record<string, unknown> = {};
	for (const [fieldName, sourcePath] of Object.entries(
		input.selection.fieldBindings,
	)) {
		const resolved = readSourceValue(input.requestPayload, sourcePath);
		if (resolved !== undefined) {
			output[fieldName] = resolved;
		}
	}
	return output;
};

const hasDispatchErrorShape = (value: unknown): value is DispatchError =>
	value !== null &&
	typeof value === "object" &&
	"code" in value &&
	"message" in value;

export type ResolveDispatchBindingPipelineResult =
	| {
			readonly ok: true;
			readonly boundInput: Readonly<Record<string, unknown>>;
			readonly entrypoint?: CompiledEntrypoint;
			readonly binding?: CompiledSurfaceBinding;
	  }
	| {
			readonly ok: false;
			readonly error: DispatchError;
	  };

export const resolveDispatchBindingPipeline = (input: {
	readonly request: DispatchRequest;
	readonly selection: SurfaceDispatchSelection;
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
}): ResolveDispatchBindingPipelineResult => {
	const requestPayload = parsePayloadBuckets(input.request);
	if (hasDispatchErrorShape(requestPayload)) {
		return {
			ok: false,
			error: {
				...requestPayload,
				details: {
					...(requestPayload.details === undefined
						? {}
						: requestPayload.details),
					handlerId: input.selection.handlerId,
				},
			},
		};
	}

	if (input.selection.entrypointKind === "route") {
		return {
			ok: true,
			boundInput: bindRoutePayload({
				requestPayload,
				selection: input.selection,
			}),
		};
	}

	const entrypointKey = `${input.selection.entrypointKind}:${input.selection.entrypointId}`;
	const entrypoint = input.entrypoints[entrypointKey];
	if (entrypoint === undefined) {
		return {
			ok: false,
			error: dispatchTransportError({
				message:
					"Dispatch target entrypoint contract is missing from compiled map.",
				details: {
					entrypointKind: input.selection.entrypointKind,
					entrypointId: input.selection.entrypointId,
					handlerId: input.selection.handlerId,
				},
			}),
		};
	}

	const bindingKey = toBindingKey({
		surfaceId: input.selection.surfaceId,
		kind: input.selection.entrypointKind,
		entrypointId: input.selection.entrypointId,
	});
	const binding = input.bindings[bindingKey];
	if (binding === undefined) {
		return {
			ok: false,
			error: dispatchTransportError({
				message:
					"Dispatch target binding contract is missing from compiled map.",
				details: {
					bindingKey,
					handlerId: input.selection.handlerId,
				},
			}),
		};
	}

	const bound = bindSurfaceInput({
		request: requestPayload,
		entrypoint,
		binding,
	});
	if (!bound.ok) {
		return {
			ok: false,
			error: dispatchTransportError({
				message: bound.error.message,
				details: {
					...(bound.error.details === undefined
						? {}
						: { bindingDetails: bound.error.details }),
					handlerId: input.selection.handlerId,
					bindingKey,
				},
			}),
		};
	}

	return {
		ok: true,
		boundInput: bound.value,
		entrypoint,
		binding,
	};
};
