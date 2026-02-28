import {
	type AuthoringErrorEnvelope,
	type AuthoringResultEnvelope,
	envelopesContracts,
} from "@gooi/authoring-contracts/envelopes";
import { buildCapabilityIndexSnapshot } from "@gooi/capability-index";
import { buildCapabilityIndexSnapshotInputSchema } from "@gooi/capability-index/contracts";
import { listAuthoringCompletionItems } from "../completion/list-authoring-completion-items";
import { publishAuthoringDiagnostics } from "../diagnostics/publish-authoring-diagnostics";
import { applyAuthoringRename } from "../rename/apply-authoring-rename";

const {
	parseAuthoringErrorEnvelope,
	parseAuthoringRequestEnvelope,
	parseAuthoringResultEnvelope,
} = envelopesContracts;

type AuthoringCliEnvelopeResult =
	| AuthoringResultEnvelope
	| AuthoringErrorEnvelope;

const asIso = (value: Date): string => value.toISOString();

const errorEnvelope = (input: {
	readonly requestId: string;
	readonly code:
		| "authoring_parse_error"
		| "authoring_symbol_error"
		| "rename_conflict_error";
	readonly message: string;
	readonly details?: Record<string, unknown>;
}): AuthoringErrorEnvelope =>
	parseAuthoringErrorEnvelope({
		envelopeVersion: "1.0.0",
		requestId: input.requestId,
		ok: false,
		error: {
			code: input.code,
			message: input.message,
			retryable: false,
			...(input.details === undefined ? {} : { details: input.details }),
		},
	});

const successEnvelope = (input: {
	readonly requestId: string;
	readonly startedAt: Date;
	readonly completedAt: Date;
	readonly result: unknown;
	readonly artifactHash?: string;
}): AuthoringResultEnvelope =>
	parseAuthoringResultEnvelope({
		envelopeVersion: "1.0.0",
		requestId: input.requestId,
		ok: true,
		result: input.result,
		timings: {
			startedAt: asIso(input.startedAt),
			completedAt: asIso(input.completedAt),
			durationMs: Math.max(
				0,
				input.completedAt.getTime() - input.startedAt.getTime(),
			),
		},
		...(input.artifactHash === undefined
			? {}
			: { meta: { artifactHash: input.artifactHash } }),
	});

/**
 * Executes one authoring CLI request envelope using language-server feature handlers.
 */
export const executeAuthoringCliEnvelope = (
	value: unknown,
): AuthoringCliEnvelopeResult => {
	const requestedAt = new Date();
	let requestId = "cli:invalid-request";

	try {
		const envelope = parseAuthoringRequestEnvelope(value);
		requestId = envelope.requestId;
		const startedAt = new Date();

		switch (envelope.operation) {
			case "index.build": {
				const input = buildCapabilityIndexSnapshotInputSchema.parse(
					envelope.payload,
				);
				const snapshot = buildCapabilityIndexSnapshot(input);
				return successEnvelope({
					requestId: envelope.requestId,
					startedAt,
					completedAt: new Date(),
					result: snapshot,
					artifactHash: snapshot.artifactHash,
				});
			}
			case "diagnose": {
				const diagnostics = publishAuthoringDiagnostics(envelope.payload);
				return successEnvelope({
					requestId: envelope.requestId,
					startedAt,
					completedAt: new Date(),
					result: diagnostics,
				});
			}
			case "complete": {
				const completion = listAuthoringCompletionItems(envelope.payload);
				return successEnvelope({
					requestId: envelope.requestId,
					startedAt,
					completedAt: new Date(),
					result: completion,
				});
			}
			case "rename": {
				const rename = applyAuthoringRename(envelope.payload);
				if (!rename.ok) {
					return errorEnvelope({
						requestId: envelope.requestId,
						code: rename.error.code,
						message: rename.error.message,
						details: {
							parity: rename.parity,
						},
					});
				}
				return successEnvelope({
					requestId: envelope.requestId,
					startedAt,
					completedAt: new Date(),
					result: rename,
				});
			}
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown CLI error.";
		return errorEnvelope({
			requestId,
			code: "authoring_parse_error",
			message,
			details: {
				requestedAt: asIso(requestedAt),
			},
		});
	}
};
