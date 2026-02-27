import type { JsonValue } from "@gooi/contract-primitives/json";

/**
 * Scalar coercion targets supported by migration operations.
 */
export type SignalMigrationCoercion = "string" | "number" | "boolean";

/**
 * One payload migration operation for a signal-version step.
 */
export type SignalMigrationOperation =
	| {
			readonly op: "set";
			readonly field: string;
			readonly value: JsonValue;
	  }
	| {
			readonly op: "copy";
			readonly from: string;
			readonly to: string;
	  }
	| {
			readonly op: "rename";
			readonly from: string;
			readonly to: string;
	  }
	| {
			readonly op: "remove";
			readonly field: string;
	  }
	| {
			readonly op: "coerce";
			readonly field: string;
			readonly to: SignalMigrationCoercion;
	  };

/**
 * One adjacent migration step (`fromVersion -> toVersion`) for a signal payload.
 */
export interface SignalMigrationStepPlan {
	readonly fromVersion: number;
	readonly toVersion: number;
	readonly operations: readonly SignalMigrationOperation[];
}

/**
 * Replay policy for one signal used by a timeline projection.
 */
export interface SignalReplayPlan {
	/** Current authored payload schema version for this signal. */
	readonly currentVersion: number;
	/** Oldest retained payload schema version expected in history. */
	readonly oldestRetainedVersion: number;
	/** Adjacent migration steps required for cumulative replay. */
	readonly steps: readonly SignalMigrationStepPlan[];
}

/**
 * Replay policy map by signal name.
 */
export type CompiledSignalReplayPolicy = Readonly<
	Record<string, SignalReplayPlan>
>;
