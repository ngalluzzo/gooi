import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type {
	ConformanceFixtureDescriptor,
	ConformanceLaneId,
} from "@gooi/conformance-contracts/fixtures";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";

export type LaneHarnessConformanceCheckId =
	| "lane_matrix_complete"
	| "lane_check_identifiers_deterministic"
	| "fixture_artifact_hashes_pinned"
	| "baseline_reproducibility";

export type LaneHarnessConformanceCheckResult =
	ConformanceCheckResultBase<LaneHarnessConformanceCheckId>;

export interface LaneAwareCheckIdentifier {
	readonly laneId: ConformanceLaneId;
	readonly checkId: string;
	readonly qualifiedCheckId: string;
}

export interface LaneHarnessLaneDefinition<
	TCheckResult extends ConformanceCheckResultBase = ConformanceCheckResultBase,
> {
	readonly laneId: ConformanceLaneId;
	readonly fixture: ConformanceFixtureDescriptor;
	readonly run: () =>
		| Promise<ConformanceSuiteReportBase<TCheckResult>>
		| ConformanceSuiteReportBase<TCheckResult>;
}

export interface LaneHarnessLaneReport<
	TCheckResult extends ConformanceCheckResultBase = ConformanceCheckResultBase,
> {
	readonly laneId: ConformanceLaneId;
	readonly fixture: ConformanceFixtureDescriptor;
	readonly report: ConformanceSuiteReportBase<TCheckResult>;
	readonly digest: string;
	readonly checkIdentifiers: readonly LaneAwareCheckIdentifier[];
}

export interface LaneHarnessConformanceReport
	extends ConformanceSuiteReportBase<LaneHarnessConformanceCheckResult> {
	readonly lanes: readonly LaneHarnessLaneReport[];
	readonly laneCheckIdentifiers: readonly LaneAwareCheckIdentifier[];
}

export interface RunLaneHarnessConformanceInput {
	readonly lanes: readonly LaneHarnessLaneDefinition[];
	readonly expectedLaneDigests?: Readonly<Record<ConformanceLaneId, string>>;
}
