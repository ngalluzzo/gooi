import { reportsContracts } from "@gooi/conformance-contracts/reports";
import { versionContracts } from "@gooi/conformance-contracts/version";
import type {
	LaneAwareCheckIdentifier,
	LaneHarnessConformanceCheckResult,
	LaneHarnessConformanceReport,
	LaneHarnessLaneDefinition,
	LaneHarnessLaneReport,
	RunLaneHarnessConformanceInput,
} from "./contracts";

const laneOrder = ["L0", "L1", "L2", "L3"] as const;

const buildCheck = (
	id: LaneHarnessConformanceCheckResult["id"],
	passed: boolean,
	detail: string,
): LaneHarnessConformanceCheckResult => ({ id, passed, detail });

const toQualifiedCheckIds = (
	lane: LaneHarnessLaneDefinition,
	reportChecks: readonly { id: string }[],
): LaneAwareCheckIdentifier[] =>
	reportChecks.map((check) => ({
		laneId: lane.laneId,
		checkId: check.id,
		qualifiedCheckId: `${lane.laneId}:${check.id}`,
	}));

const sortedLanes = (lanes: readonly LaneHarnessLaneDefinition[]) =>
	[...lanes].sort(
		(left, right) =>
			laneOrder.indexOf(left.laneId) - laneOrder.indexOf(right.laneId),
	);

const hasPinnedArtifactHashes = (value: Record<string, string>) =>
	Object.keys(value).length > 0;

/**
 * Runs one lane-aware conformance harness execution across L0/L1/L2/L3 variants.
 */
export const runLaneHarnessConformance = async (
	input: RunLaneHarnessConformanceInput,
): Promise<LaneHarnessConformanceReport> => {
	const lanes = sortedLanes(input.lanes);
	const checks: LaneHarnessConformanceCheckResult[] = [];
	const laneReports: LaneHarnessLaneReport[] = [];
	const laneCheckIdentifiers: LaneAwareCheckIdentifier[] = [];

	for (const lane of lanes) {
		const report = await lane.run();
		const digest = reportsContracts.serializeConformanceReportDeterministically(
			{
				fixture: lane.fixture,
				report,
			},
		);
		const identifiers = toQualifiedCheckIds(lane, report.checks);
		laneCheckIdentifiers.push(...identifiers);
		laneReports.push({
			laneId: lane.laneId,
			fixture: lane.fixture,
			report,
			digest,
			checkIdentifiers: identifiers,
		});
	}

	const hasAllLanes = laneOrder.every((laneId) =>
		laneReports.some((entry) => entry.laneId === laneId),
	);
	checks.push(
		buildCheck(
			"lane_matrix_complete",
			hasAllLanes,
			hasAllLanes
				? "Harness executed L0/L1/L2/L3 variants in one run."
				: "Harness did not include all required L0/L1/L2/L3 variants.",
		),
	);

	const qualifiedCheckIds = laneCheckIdentifiers.map(
		(identifier) => identifier.qualifiedCheckId,
	);
	const uniqueQualifiedCheckIds = new Set(qualifiedCheckIds);
	const deterministicLaneCheckIds =
		uniqueQualifiedCheckIds.size === qualifiedCheckIds.length;
	checks.push(
		buildCheck(
			"lane_check_identifiers_deterministic",
			deterministicLaneCheckIds,
			deterministicLaneCheckIds
				? "Lane-aware check identifiers are deterministic and collision-free."
				: "Duplicate lane-aware check identifiers were detected.",
		),
	);

	const fixtureArtifactsPinned = laneReports.every((lane) => {
		const fixture = lane.fixture;
		return (
			fixture.laneId === lane.laneId &&
			versionContracts.isConformanceContractVersionSupported(
				fixture.contractVersion,
			) &&
			hasPinnedArtifactHashes(fixture.artifactHashes)
		);
	});
	checks.push(
		buildCheck(
			"fixture_artifact_hashes_pinned",
			fixtureArtifactsPinned,
			fixtureArtifactsPinned
				? "Fixture and artifact hashes are pinned for all lane variants."
				: "Lane fixture metadata is missing pinned hashes or uses unsupported contract version.",
		),
	);

	const baselineReproducibility =
		input.expectedLaneDigests === undefined
			? true
			: laneReports.every(
					(lane) => input.expectedLaneDigests?.[lane.laneId] === lane.digest,
				);
	checks.push(
		buildCheck(
			"baseline_reproducibility",
			baselineReproducibility,
			input.expectedLaneDigests === undefined
				? "No baseline digest map supplied; emitted deterministic digests for future comparisons."
				: baselineReproducibility
					? "Lane reports matched expected baseline digests."
					: "One or more lane report digests diverged from expected baselines.",
		),
	);

	return {
		passed: checks.every((check) => check.passed),
		checks,
		lanes: laneReports,
		laneCheckIdentifiers,
	};
};
