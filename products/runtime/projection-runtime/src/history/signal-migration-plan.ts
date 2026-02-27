import type { ProjectionSourceRef } from "@gooi/projection-contracts/plans/projection-plan";
import type {
	SignalMigrationStepPlan,
	SignalReplayPlan,
} from "@gooi/projection-contracts/plans/signal-migration-plan";
import { buildSignalMigrationError } from "./signal-migration-operation";

export interface PreparedReplayPlan {
	readonly currentVersion: number;
	readonly oldestRetainedVersion: number;
	readonly stepByFromVersion: ReadonlyMap<number, SignalMigrationStepPlan>;
}

/**
 * Validates one signal replay policy and compiles a lookup map by `fromVersion`.
 */
export const validateSignalReplayPlan = (
	signalName: string,
	plan: SignalReplayPlan,
	sourceRef: ProjectionSourceRef,
):
	| { readonly ok: true; readonly value: PreparedReplayPlan }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof buildSignalMigrationError>;
	  } => {
	if (plan.currentVersion < 1 || plan.oldestRetainedVersion < 1) {
		return {
			ok: false,
			error: buildSignalMigrationError(
				sourceRef,
				"Signal replay versions must be >= 1.",
				{ signalName },
			),
		};
	}
	if (plan.oldestRetainedVersion > plan.currentVersion) {
		return {
			ok: false,
			error: buildSignalMigrationError(
				sourceRef,
				"Signal replay oldest version cannot exceed current version.",
				{
					signalName,
					oldestRetainedVersion: plan.oldestRetainedVersion,
					currentVersion: plan.currentVersion,
				},
			),
		};
	}

	const stepByFromVersion = new Map<number, SignalMigrationStepPlan>();
	for (const step of plan.steps) {
		if (step.toVersion !== step.fromVersion + 1) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					sourceRef,
					"Signal migration steps must be adjacent version hops.",
					{
						signalName,
						fromVersion: step.fromVersion,
						toVersion: step.toVersion,
					},
				),
			};
		}
		if (stepByFromVersion.has(step.fromVersion)) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					sourceRef,
					"Signal migration steps contain duplicate fromVersion entries.",
					{ signalName, fromVersion: step.fromVersion },
				),
			};
		}
		stepByFromVersion.set(step.fromVersion, step);
	}

	for (
		let version = plan.oldestRetainedVersion;
		version < plan.currentVersion;
		version += 1
	) {
		if (!stepByFromVersion.has(version)) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					sourceRef,
					"Signal migration chain has a missing version segment.",
					{ signalName, missingFromVersion: version },
				),
			};
		}
	}

	return {
		ok: true,
		value: {
			currentVersion: plan.currentVersion,
			oldestRetainedVersion: plan.oldestRetainedVersion,
			stepByFromVersion,
		},
	};
};
