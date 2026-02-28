import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceDiagnosticRecordBase } from "@gooi/conformance-contracts/diagnostics";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";

export type DeterminismConformanceCheckId =
	| "artifact_outputs_deterministic"
	| "envelope_outputs_deterministic";

export type DeterminismConformanceCheckResult =
	ConformanceCheckResultBase<DeterminismConformanceCheckId>;

export interface DeterminismConformanceDiagnostic
	extends ConformanceDiagnosticRecordBase<"conformance_determinism_error"> {}

export interface DeterminismRunCase {
	readonly id: string;
	readonly run: () => Promise<unknown> | unknown;
}

export interface RunDeterminismConformanceInput {
	readonly artifactCases: readonly DeterminismRunCase[];
	readonly envelopeCases: readonly DeterminismRunCase[];
	readonly iterations?: number;
}

export interface DeterminismConformanceReport
	extends ConformanceSuiteReportBase<DeterminismConformanceCheckResult> {
	readonly diagnostics: readonly DeterminismConformanceDiagnostic[];
}
