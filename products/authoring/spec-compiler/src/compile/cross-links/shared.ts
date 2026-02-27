import type { CompileDiagnostic } from "@gooi/app-spec-contracts/compiled";

export const asRecord = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined =>
	typeof value === "object" && value !== null
		? (value as Readonly<Record<string, unknown>>)
		: undefined;

export const asString = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

export const referenceNotFound = (
	path: string,
	message: string,
	hint?: string,
): CompileDiagnostic => ({
	severity: "error",
	code: "spec_reference_not_found_error",
	path,
	message,
	...(hint === undefined ? {} : { hint }),
});
