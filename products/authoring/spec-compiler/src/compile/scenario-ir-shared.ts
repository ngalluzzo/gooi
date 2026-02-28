import type { CompileDiagnostic } from "@gooi/app-spec-contracts/compiled";

export type CaptureSource =
	| "last_trigger_output"
	| "last_signal_payload"
	| "last_expectation_output"
	| "context";

export interface ScenarioCaptureBinding {
	readonly captureId: string;
	readonly source: CaptureSource;
	readonly path: string;
}

export const sortRecord = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

export const scenarioIRError = (
	path: string,
	message: string,
): CompileDiagnostic => ({
	severity: "error",
	code: "scenario_ir_invalid_error",
	path,
	message,
});
