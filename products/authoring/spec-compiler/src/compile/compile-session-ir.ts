import {
	type CanonicalSpecModel,
	type CompileDiagnostic,
	type CompiledSessionFieldPlan,
	type CompiledSessionIR,
	compiledContracts,
} from "@gooi/app-spec-contracts/compiled";
import { asRecord } from "./cross-links/shared";

interface CompileSessionIROutput {
	readonly sessionIR: CompiledSessionIR;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const sortRecord = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

const sessionIRError = (path: string, message: string): CompileDiagnostic => ({
	severity: "error",
	code: "session_ir_invalid_error",
	path,
	message,
});

const resolveRequired = (value: unknown): boolean => {
	if (typeof value === "string") {
		return value.endsWith("!");
	}
	const valueRecord = asRecord(value);
	return valueRecord?.required === true;
};

/**
 * Compiles session fields/defaults into deterministic session IR.
 */
export const compileSessionIR = (input: {
	readonly model: CanonicalSpecModel;
}): CompileSessionIROutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const sessionRecord = asRecord(input.model.sections.session) ?? {};
	const fieldValues = asRecord(sessionRecord.fields) ?? {};
	const defaultValues = asRecord(sessionRecord.defaults) ?? {};
	const defaults = sortRecord(defaultValues);
	const fields: Record<string, CompiledSessionFieldPlan> = {};

	for (const fieldId of Object.keys(fieldValues).sort((left, right) =>
		left.localeCompare(right),
	)) {
		fields[fieldId] = {
			fieldId,
			definition: fieldValues[fieldId],
			required: resolveRequired(fieldValues[fieldId]),
			hasDefault: Object.hasOwn(defaultValues, fieldId),
		};
	}

	for (const defaultFieldId of Object.keys(defaultValues).sort((left, right) =>
		left.localeCompare(right),
	)) {
		if (fields[defaultFieldId] !== undefined) {
			continue;
		}
		diagnostics.push(
			sessionIRError(
				`session.defaults.${defaultFieldId}`,
				"Session default references an undeclared session field.",
			),
		);
	}

	return {
		sessionIR: {
			artifactVersion: compiledContracts.compiledSessionIRVersion,
			fields: sortRecord(fields),
			defaults,
		},
		diagnostics,
	};
};
