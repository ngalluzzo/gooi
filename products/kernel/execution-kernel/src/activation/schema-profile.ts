import type {
	CompiledEntrypoint,
	CompiledEntrypointBundle,
} from "@gooi/app-spec-contracts/compiled";
import { hostProviderSchemaProfile } from "@gooi/capability-contracts/capability-port";
import type {
	InvocationEnvelope,
	ResultEnvelope,
} from "@gooi/surface-contracts/envelope";
import { errorEnvelope, errorResult } from "../errors/errors";

interface ValidateSchemaProfileInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly entrypoint: CompiledEntrypoint;
	readonly invocation: InvocationEnvelope<Readonly<Record<string, unknown>>>;
	readonly startedAt: string;
	readonly nowIso: () => string;
}

export type SchemaProfileValidationResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly result: ResultEnvelope<unknown, unknown> };

/**
 * Validates that compiled schema artifacts exist and match the runtime profile.
 */
export const validateSchemaProfile = (
	input: ValidateSchemaProfileInput,
): SchemaProfileValidationResult => {
	const schemaArtifact =
		input.bundle.schemaArtifacts[input.entrypoint.schemaArtifactKey];
	if (schemaArtifact === undefined) {
		return {
			ok: false,
			result: errorResult(
				input.invocation,
				input.bundle.artifactHash,
				input.startedAt,
				input.nowIso,
				errorEnvelope(
					"validation_error",
					"Compiled entrypoint schema artifact is missing.",
					false,
					{
						entrypointId: input.entrypoint.id,
						entrypointKind: input.entrypoint.kind,
						schemaArtifactKey: input.entrypoint.schemaArtifactKey,
					},
				),
			),
		};
	}

	if (schemaArtifact.target !== hostProviderSchemaProfile) {
		return {
			ok: false,
			result: errorResult(
				input.invocation,
				input.bundle.artifactHash,
				input.startedAt,
				input.nowIso,
				errorEnvelope(
					"validation_error",
					"Compiled entrypoint schema profile does not match the pinned host/provider profile.",
					false,
					{
						code: "schema_profile_mismatch",
						expectedSchemaProfile: hostProviderSchemaProfile,
						actualSchemaProfile: schemaArtifact.target,
						entrypointId: input.entrypoint.id,
						entrypointKind: input.entrypoint.kind,
						schemaArtifactKey: input.entrypoint.schemaArtifactKey,
					},
				),
			),
		};
	}

	return { ok: true };
};
