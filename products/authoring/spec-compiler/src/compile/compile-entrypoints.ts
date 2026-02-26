import type { AuthoringEntrypointSpec } from "../authoring-spec/authoring-spec";
import type {
	CompileDiagnostic,
	CompiledEntrypoint,
	CompiledEntrypointKind,
	CompiledJsonSchemaArtifact,
} from "./compile.contracts";
import {
	buildInputFieldContracts,
	buildInputSchemaArtifact,
} from "./schema-artifacts";

interface CompileEntrypointsOutput {
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	readonly schemaArtifacts: Readonly<
		Record<string, CompiledJsonSchemaArtifact>
	>;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const entrypointKey = (kind: CompiledEntrypointKind, id: string): string =>
	`${kind}:${id}`;

const schemaKey = (kind: CompiledEntrypointKind, id: string): string =>
	`entrypoint.${kind}.${id}.input`;

const unsupportedScalarDiagnostic = (
	path: string,
	annotation: string,
): CompileDiagnostic => ({
	severity: "error",
	code: "unsupported_scalar_type",
	path,
	message: `Unsupported scalar annotation \`${annotation}\`.`,
	hint: "Use one of: text, id, int, number, bool, timestamp with optional ! suffix.",
});

const duplicateEntrypointDiagnostic = (
	kind: CompiledEntrypointKind,
	path: string,
	id: string,
): CompileDiagnostic => ({
	severity: "error",
	code: "duplicate_entrypoint_id",
	path,
	message: `Duplicate ${kind} id \`${id}\` is not allowed.`,
});

const compileOneEntrypoint = (
	kind: CompiledEntrypointKind,
	specEntrypoint: {
		readonly id: string;
		readonly access: { readonly roles: readonly string[] };
		readonly in: Readonly<Record<string, string>>;
		readonly defaults?: Readonly<Record<string, unknown>> | undefined;
	},
	pathPrefix: string,
): CompileEntrypointsOutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const inputFields = buildInputFieldContracts(specEntrypoint.in);
	for (const [fieldName, annotation] of Object.entries(specEntrypoint.in)) {
		if (inputFields[fieldName] === undefined) {
			diagnostics.push(
				unsupportedScalarDiagnostic(
					`${pathPrefix}.in.${fieldName}`,
					annotation,
				),
			);
		}
	}
	if (diagnostics.some((item) => item.severity === "error")) {
		return {
			entrypoints: {},
			schemaArtifacts: {},
			diagnostics,
		};
	}
	const artifactKey = schemaKey(kind, specEntrypoint.id);
	const compiled: CompiledEntrypoint = {
		id: specEntrypoint.id,
		kind,
		inputFields,
		defaultInput: specEntrypoint.defaults ?? {},
		accessRoles: [...specEntrypoint.access.roles],
		schemaArtifactKey: artifactKey,
	};
	return {
		entrypoints: {
			[entrypointKey(kind, specEntrypoint.id)]: compiled,
		},
		schemaArtifacts: {
			[artifactKey]: buildInputSchemaArtifact(inputFields),
		},
		diagnostics,
	};
};

/**
 * Compiles query and mutation entrypoint contracts from authoring spec.
 *
 * @param spec - Parsed authoring spec.
 * @returns Compiled entrypoints, schema artifacts, and diagnostics.
 *
 * @example
 * const output = compileEntrypoints(spec);
 */
export const compileEntrypoints = (
	spec: AuthoringEntrypointSpec,
): CompileEntrypointsOutput => {
	const entrypoints: Record<string, CompiledEntrypoint> = {};
	const schemaArtifacts: Record<string, CompiledJsonSchemaArtifact> = {};
	const diagnostics: CompileDiagnostic[] = [];
	const seenQueryIds = new Set<string>();
	const seenMutationIds = new Set<string>();

	for (let index = 0; index < spec.queries.length; index += 1) {
		const query = spec.queries[index];
		if (query === undefined) {
			continue;
		}
		if (seenQueryIds.has(query.id)) {
			diagnostics.push(
				duplicateEntrypointDiagnostic("query", `queries.${index}.id`, query.id),
			);
			continue;
		}
		seenQueryIds.add(query.id);
		const output = compileOneEntrypoint("query", query, `queries.${index}`);
		Object.assign(entrypoints, output.entrypoints);
		Object.assign(schemaArtifacts, output.schemaArtifacts);
		diagnostics.push(...output.diagnostics);
	}

	for (let index = 0; index < spec.mutations.length; index += 1) {
		const mutation = spec.mutations[index];
		if (mutation === undefined) {
			continue;
		}
		if (seenMutationIds.has(mutation.id)) {
			diagnostics.push(
				duplicateEntrypointDiagnostic(
					"mutation",
					`mutations.${index}.id`,
					mutation.id,
				),
			);
			continue;
		}
		seenMutationIds.add(mutation.id);
		const output = compileOneEntrypoint(
			"mutation",
			mutation,
			`mutations.${index}`,
		);
		Object.assign(entrypoints, output.entrypoints);
		Object.assign(schemaArtifacts, output.schemaArtifacts);
		diagnostics.push(...output.diagnostics);
	}

	return {
		entrypoints,
		schemaArtifacts,
		diagnostics,
	};
};
