import type {
	CompileDiagnostic,
	CompiledDomainValueSource,
} from "@gooi/app-spec-contracts/compiled";
import { asRecord, asString } from "./cross-links/shared";

export const sortRecord = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

export const domainRuntimeIRError = (
	path: string,
	message: string,
): CompileDiagnostic => ({
	severity: "error",
	code: "domain_runtime_ir_invalid_error",
	path,
	message,
});

export const parseValueSource = (
	value: unknown,
	path: string,
	diagnostics: CompileDiagnostic[],
): CompiledDomainValueSource | undefined => {
	const recordValue = asRecord(value);
	if (recordValue !== undefined) {
		const kind = asString(recordValue.kind);
		if (kind === "input") {
			const sourcePath = asString(recordValue.path);
			if (sourcePath === undefined) {
				diagnostics.push(
					domainRuntimeIRError(
						path,
						"Input value source requires a string `path`.",
					),
				);
				return undefined;
			}
			return { kind: "input", path: sourcePath };
		}
		if (kind === "literal" && "value" in recordValue) {
			return { kind: "literal", value: recordValue.value };
		}
		const expression = asRecord(recordValue.$expr);
		const variable = asString(expression?.var);
		if (variable?.startsWith("input.")) {
			return {
				kind: "input",
				path: variable.slice("input.".length),
			};
		}
	}
	if (typeof value === "string") {
		return { kind: "input", path: value };
	}
	if (value === undefined) {
		diagnostics.push(
			domainRuntimeIRError(
				path,
				"Value source must be an input reference, literal source object, or static value.",
			),
		);
		return undefined;
	}
	return { kind: "literal", value };
};
