import type { JsonObject, JsonValue } from "@gooi/contract-primitives/json";
import {
	normalizeForStableJson,
	sha256,
	stableStringify,
} from "@gooi/stable-json";
import { z } from "zod";

/**
 * Side-effect categories allowed by capability contracts.
 */
export const effectKindSchema = z.enum([
	"compute",
	"read",
	"write",
	"network",
	"emit",
	"session",
]);

/**
 * Supported side-effect categories.
 */
export type EffectKind = z.infer<typeof effectKindSchema>;

/**
 * JSON Schema draft targets supported for generated contract artifacts.
 */
export const boundarySchemaTargetSchema = z.enum([
	"draft-4",
	"draft-7",
	"draft-2020-12",
	"openapi-3.0",
]);

/**
 * JSON Schema target values for contract artifact generation.
 */
export type BoundarySchemaTarget = z.infer<typeof boundarySchemaTargetSchema>;

/**
 * Pinned host/provider boundary schema profile from RFC-0001.
 */
export const hostProviderSchemaProfileSchema = z.literal("draft-2020-12");

/**
 * Pinned host/provider boundary schema profile value.
 */
export type HostProviderSchemaProfile = z.infer<
	typeof hostProviderSchemaProfileSchema
>;

/**
 * Canonical host/provider schema profile used by contract tooling.
 */
export const hostProviderSchemaProfile = hostProviderSchemaProfileSchema.value;

/**
 * Generic JSON object used for generated JSON Schema artifacts.
 */
export type JsonSchema = JsonObject;

type CapabilityBoundarySchema = z.ZodType<JsonValue>;

const jsonSchemaSchema = z.record(z.string(), z.any());

const zodWithToJsonSchema = z as {
	toJSONSchema: (
		schemaValue: CapabilityBoundarySchema,
		options: {
			target: BoundarySchemaTarget;
			unrepresentable: "throw";
			cycles: "ref";
			reused: "inline";
			io: "output";
		},
	) => JsonObject;
};

/**
 * Generated JSON Schema artifact and deterministic hash for a boundary schema.
 */
export interface SchemaArtifact {
	/** JSON Schema target draft. */
	readonly target: BoundarySchemaTarget;
	/** Normalized JSON Schema object. */
	readonly schema: JsonSchema;
	/** SHA-256 hash of normalized schema JSON. */
	readonly hash: string;
}

/**
 * Converts Zod schema to normalized JSON Schema artifact.
 */
export const buildSchemaArtifact = (
	schema: CapabilityBoundarySchema,
	target: BoundarySchemaTarget,
): SchemaArtifact => {
	const generated = zodWithToJsonSchema.toJSONSchema(schema, {
		target,
		unrepresentable: "throw",
		cycles: "ref",
		reused: "inline",
		io: "output",
	});

	const parsed = jsonSchemaSchema.parse(generated);
	const normalized = normalizeForStableJson(parsed) as JsonSchema;
	const hash = sha256(stableStringify(normalized));

	return {
		target,
		schema: normalized,
		hash,
	};
};

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});

/**
 * Full schema artifact set for capability boundary IO.
 */
export interface CapabilityArtifacts {
	/** Input schema artifact generated from Zod. */
	readonly input: SchemaArtifact;
	/** Output schema artifact generated from Zod. */
	readonly output: SchemaArtifact;
	/** Error schema artifact generated from Zod. */
	readonly error: SchemaArtifact;
	/** Deterministic hash across all capability contract fields. */
	readonly contractHash: string;
}

/**
 * Zod-authored capability port contract.
 */
export interface CapabilityPortContract {
	/** Unique capability port identifier. */
	readonly id: string;
	/** Semantic version for this port contract. */
	readonly version: string;
	/** Allowed side-effect categories for observed runtime effects. */
	readonly declaredEffects: readonly EffectKind[];
	/** Zod boundary schemas used for runtime validation. */
	readonly schemas: {
		/** Input Zod schema. */
		readonly input: CapabilityBoundarySchema;
		/** Output Zod schema. */
		readonly output: CapabilityBoundarySchema;
		/** Error Zod schema. */
		readonly error: CapabilityBoundarySchema;
	};
	/** Generated JSON Schema artifacts used for compatibility and locking. */
	readonly artifacts: CapabilityArtifacts;
}

/**
 * Input for defining a capability port contract.
 */
export interface DefineCapabilityPortInput {
	/** Unique capability port identifier. */
	readonly id: string;
	/** Semantic version for the capability port. */
	readonly version: string;
	/** Input boundary schema authored in Zod. */
	readonly input: CapabilityBoundarySchema;
	/** Output boundary schema authored in Zod. */
	readonly output: CapabilityBoundarySchema;
	/** Error boundary schema authored in Zod. */
	readonly error: CapabilityBoundarySchema;
	/** Declared side effects allowed at runtime. */
	readonly declaredEffects: readonly EffectKind[];
}

/**
 * Defines a capability contract from Zod boundary schemas.
 */
export const defineCapabilityPort = (
	input: DefineCapabilityPortInput,
): CapabilityPortContract => {
	const id = z.string().min(1).parse(input.id);
	const version = semverSchema.parse(input.version);
	const target = hostProviderSchemaProfile;

	const declaredEffects = z
		.array(effectKindSchema)
		.min(1)
		.parse([...input.declaredEffects]);

	const inputArtifact = buildSchemaArtifact(input.input, target);
	const outputArtifact = buildSchemaArtifact(input.output, target);
	const errorArtifact = buildSchemaArtifact(input.error, target);

	const contractHash = sha256(
		stableStringify({
			id,
			version,
			declaredEffects,
			inputHash: inputArtifact.hash,
			outputHash: outputArtifact.hash,
			errorHash: errorArtifact.hash,
			target,
		}),
	);

	return {
		id,
		version,
		declaredEffects,
		schemas: {
			input: input.input,
			output: input.output,
			error: input.error,
		},
		artifacts: {
			input: inputArtifact,
			output: outputArtifact,
			error: errorArtifact,
			contractHash,
		},
	};
};
