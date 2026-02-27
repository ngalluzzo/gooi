import type { CompiledTimelineProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";
import type {
	SignalMigrationStepPlan,
	SignalReplayPlan,
} from "@gooi/projection-contracts/plans/signal-migration-plan";
import type { HistoryRecord } from "@gooi/projection-contracts/ports/history-port-contract";
import {
	applySignalMigrationOperation,
	buildSignalMigrationError,
} from "./signal-migration-operation";
import { validateSignalReplayPlan } from "./signal-migration-plan";

const defaultReplayPlan: SignalReplayPlan = {
	currentVersion: 1,
	oldestRetainedVersion: 1,
	steps: [],
};

const buildDefaultPreparedReplay = (): {
	readonly currentVersion: number;
	readonly oldestRetainedVersion: number;
	readonly stepByFromVersion: ReadonlyMap<number, SignalMigrationStepPlan>;
} => ({
	currentVersion: 1,
	oldestRetainedVersion: 1,
	stepByFromVersion: new Map<number, SignalMigrationStepPlan>(),
});

/**
 * Applies cumulative signal migration-chain replay before timeline reducers run.
 */
export const applyTimelineSignalMigrations = (
	plan: CompiledTimelineProjectionPlan,
	records: readonly HistoryRecord[],
):
	| { readonly ok: true; readonly records: readonly HistoryRecord[] }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof buildSignalMigrationError>;
	  } => {
	const preparedBySignal = new Map<
		string,
		ReturnType<typeof buildDefaultPreparedReplay>
	>();

	for (const signalName of plan.signals) {
		const validated = validateSignalReplayPlan(
			signalName,
			plan.signalReplay[signalName] ?? defaultReplayPlan,
			plan.sourceRef,
		);
		if (!validated.ok) {
			return validated;
		}
		preparedBySignal.set(signalName, validated.value);
	}

	const migrated: HistoryRecord[] = [];
	for (const record of records) {
		const replay =
			preparedBySignal.get(record.signalName) ?? buildDefaultPreparedReplay();

		if (record.signalVersion < replay.oldestRetainedVersion) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					plan.sourceRef,
					"Signal history contains versions older than the retained migration policy.",
					{
						signalName: record.signalName,
						recordVersion: record.signalVersion,
						oldestRetainedVersion: replay.oldestRetainedVersion,
					},
				),
			};
		}
		if (record.signalVersion > replay.currentVersion) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					plan.sourceRef,
					"Signal history version is newer than the compiled replay policy.",
					{
						signalName: record.signalName,
						recordVersion: record.signalVersion,
						currentVersion: replay.currentVersion,
					},
				),
			};
		}
		if (record.signalVersion === replay.currentVersion) {
			migrated.push(record);
			continue;
		}

		const payload = JSON.parse(JSON.stringify(record.payload)) as Record<
			string,
			unknown
		>;
		for (
			let version = record.signalVersion;
			version < replay.currentVersion;
			version += 1
		) {
			const step = replay.stepByFromVersion.get(version);
			if (step === undefined) {
				return {
					ok: false,
					error: buildSignalMigrationError(
						plan.sourceRef,
						"Signal migration chain has a missing runtime segment.",
						{ signalName: record.signalName, missingFromVersion: version },
					),
				};
			}
			for (const operation of step.operations) {
				const operationResult = applySignalMigrationOperation(
					payload,
					operation,
					plan.sourceRef,
					record.signalName,
					version,
				);
				if (!operationResult.ok) {
					return operationResult;
				}
			}
		}

		migrated.push({
			...record,
			signalVersion: replay.currentVersion,
			payload,
		});
	}

	return { ok: true, records: migrated };
};
