import {
	normalizeForStableJson,
	sha256,
	stableStringify,
} from "@gooi/stable-json";
import { z } from "zod";

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
 * Declared side-effect categories that capability calls may observe.
 */
export const effectKindSchema = z.enum([
	"read",
	"write",
	"emit",
	"session",
	"network",
	"compute",
]);

/**
 * Side-effect categories allowed in capability contracts.
 */
export type EffectKind = z.infer<typeof effectKindSchema>;

/**
 * Generic JSON object used for generated JSON Schema artifacts.
 */
export type JsonSchema = Readonly<Record<string, unknown>>;

const jsonSchemaSchema = z.record(z.string(), z.unknown());

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});

/**
 * Identifier for a capability port and version pair.
 */
export const capabilityPortReferenceSchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
});

/**
 * A capability reference tuple.
 */
export type CapabilityPortReference = z.infer<
	typeof capabilityPortReferenceSchema
>;

/**
 * Manifest declaration for one provider-fulfilled capability.
 */
export const providerCapabilitySchema = capabilityPortReferenceSchema.extend({
	contractHash: z.string().regex(/^[a-f0-9]{64}$/),
});

/**
 * Provider capability manifest entry.
 */
export type ProviderCapability = z.infer<typeof providerCapabilitySchema>;

/**
 * Provider manifest contract used by runtime activation.
 */
export const providerManifestSchema = z.object({
	providerId: z.string().min(1),
	providerVersion: semverSchema,
	hostApiRange: z.string().min(1),
	capabilities: z.array(providerCapabilitySchema).min(1),
});

/**
 * Provider activation manifest.
 */
export type ProviderManifest = z.infer<typeof providerManifestSchema>;

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
		readonly input: z.ZodType<unknown>;
		/** Output Zod schema. */
		readonly output: z.ZodType<unknown>;
		/** Error Zod schema. */
		readonly error: z.ZodType<unknown>;
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
	readonly input: z.ZodType<unknown>;
	/** Output boundary schema authored in Zod. */
	readonly output: z.ZodType<unknown>;
	/** Error boundary schema authored in Zod. */
	readonly error: z.ZodType<unknown>;
	/** Declared side effects allowed at runtime. */
	readonly declaredEffects: readonly EffectKind[];
	/** Optional JSON Schema draft target for generated artifacts. */
	readonly target?: BoundarySchemaTarget;
}

/**
 * Converts Zod schema to normalized JSON Schema artifact.
 *
 * @param schema - Boundary Zod schema.
 * @param target - JSON Schema target draft.
 * @returns Generated artifact with deterministic hash.
 *
 * @example
 * const artifact = buildSchemaArtifact(z.object({ id: z.string() }), "draft-7");
 */
export const buildSchemaArtifact = (
	schema: z.ZodType<unknown>,
	target: BoundarySchemaTarget,
): SchemaArtifact => {
	const generated = (
		z as unknown as {
			toJSONSchema: (
				schemaValue: z.ZodType<unknown>,
				options: {
					target: BoundarySchemaTarget;
					unrepresentable: "throw";
					cycles: "ref";
					reused: "inline";
					io: "output";
				},
			) => unknown;
		}
	).toJSONSchema(schema, {
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

/**
 * Defines a capability contract from Zod boundary schemas.
 *
 * @param input - Capability contract definition.
 * @returns Capability contract with generated artifacts and deterministic hash.
 *
 * @example
 * const port = defineCapabilityPort({
 *   id: "ids.generate",
 *   version: "1.0.0",
 *   input: z.object({ count: z.number().int().positive() }),
 *   output: z.object({ ids: z.array(z.string()) }),
 *   error: z.object({ code: z.string(), message: z.string() }),
 *   declaredEffects: ["compute"],
 * });
 */
export const defineCapabilityPort = (
	input: DefineCapabilityPortInput,
): CapabilityPortContract => {
	const id = z.string().min(1).parse(input.id);
	const version = semverSchema.parse(input.version);
	const target = boundarySchemaTargetSchema.parse(input.target ?? "draft-7");

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

/**
 * Parses and validates a provider manifest.
 *
 * @param value - Untrusted manifest value.
 * @returns Parsed provider manifest.
 *
 * @example
 * const manifest = parseProviderManifest(rawManifest);
 */
export const parseProviderManifest = (value: unknown): ProviderManifest =>
	providerManifestSchema.parse(value);
