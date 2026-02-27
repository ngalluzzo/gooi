import {
	buildSchemaArtifact,
	hostProviderSchemaProfile,
	type JsonSchema,
	type SchemaArtifact,
} from "@gooi/capability-contracts/capability-port";
import { z } from "zod";
import type {
	CompiledInputField,
	CompiledJsonSchemaArtifact,
	CompiledScalarType,
} from "./compile.contracts";

/**
 * Parsed scalar type annotation for one input field.
 */
export interface ParsedScalarAnnotation {
	/** Scalar type name without optional marker. */
	readonly scalarType: CompiledScalarType;
	/** True when the field has a required `!` suffix. */
	readonly required: boolean;
}

const scalarSet = new Set<CompiledScalarType>([
	"text",
	"id",
	"int",
	"number",
	"bool",
	"timestamp",
]);

const toZodScalar = (scalarType: CompiledScalarType): z.ZodType<unknown> => {
	switch (scalarType) {
		case "text":
		case "id":
			return z.string();
		case "int":
			return z.number().int();
		case "number":
			return z.number();
		case "bool":
			return z.boolean();
		case "timestamp":
			return z.string().datetime({ offset: true });
	}
};

/**
 * Parses a scalar annotation like `text!` or `int`.
 *
 * @param annotation - Authoring field annotation.
 * @returns Parsed scalar annotation, or null when unsupported.
 *
 * @example
 * const parsed = parseScalarAnnotation("text!");
 */
export const parseScalarAnnotation = (
	annotation: string,
): ParsedScalarAnnotation | null => {
	const required = annotation.endsWith("!");
	const scalarText = required ? annotation.slice(0, -1) : annotation;
	if (!scalarSet.has(scalarText as CompiledScalarType)) {
		return null;
	}
	return {
		scalarType: scalarText as CompiledScalarType,
		required,
	};
};

/**
 * Builds compiled input field contracts from authoring annotations.
 *
 * @param fields - Authoring field annotation map.
 * @returns Field contracts keyed by field name.
 *
 * @example
 * const contracts = buildInputFieldContracts({ page: "int", message: "text!" });
 */
export const buildInputFieldContracts = (
	fields: Readonly<Record<string, string>>,
): Readonly<Record<string, CompiledInputField>> => {
	const contracts: Record<string, CompiledInputField> = {};
	for (const [fieldName, annotation] of Object.entries(fields)) {
		const parsed = parseScalarAnnotation(annotation);
		if (parsed === null) {
			continue;
		}
		contracts[fieldName] = {
			scalarType: parsed.scalarType,
			required: parsed.required,
		};
	}
	return contracts;
};

const toCompiledArtifact = (
	artifact: SchemaArtifact,
): CompiledJsonSchemaArtifact => ({
	target: hostProviderSchemaProfile,
	schema: artifact.schema as JsonSchema,
	hash: artifact.hash,
});

/**
 * Builds a generated JSON Schema artifact for compiled input fields.
 *
 * @param inputFields - Compiled field contracts.
 * @returns Generated pinned host/provider schema-profile artifact.
 *
 * @example
 * const artifact = buildInputSchemaArtifact({ message: { scalarType: "text", required: true } });
 */
export const buildInputSchemaArtifact = (
	inputFields: Readonly<Record<string, CompiledInputField>>,
): CompiledJsonSchemaArtifact => {
	const shape: Record<string, z.ZodType<unknown>> = {};
	for (const [fieldName, field] of Object.entries(inputFields)) {
		const scalarSchema = toZodScalar(field.scalarType);
		shape[fieldName] = field.required ? scalarSchema : scalarSchema.optional();
	}
	const objectSchema = z.object(shape).strict();
	const generated = buildSchemaArtifact(
		objectSchema,
		hostProviderSchemaProfile,
	);
	return toCompiledArtifact(generated);
};
