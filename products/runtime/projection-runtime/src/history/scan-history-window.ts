import { createProjectionError } from "@gooi/projection-contracts/errors/projection-errors";
import type {
	CompiledTimelineProjectionPlan,
	ProjectionSourceRef,
} from "@gooi/projection-contracts/plans/projection-plan";
import type {
	HistoryPort,
	HistoryScanResult,
} from "@gooi/projection-contracts/ports/history-port-contract";

interface ScanTimelineHistoryInput {
	readonly historyPort: HistoryPort | undefined;
	readonly plan: CompiledTimelineProjectionPlan;
	readonly args: Readonly<Record<string, unknown>>;
	readonly asOf: string | null;
	readonly sourceRef: ProjectionSourceRef;
}

const toLimit = (value: unknown): number | null => {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
		return null;
	}
	return value;
};

/**
 * Scans one timeline history window with capability gating and stable limits.
 */
export const scanTimelineHistoryWindow = async (
	input: ScanTimelineHistoryInput,
): Promise<
	| { readonly ok: true; readonly value: HistoryScanResult }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof createProjectionError>;
	  }
> => {
	if (input.historyPort === undefined) {
		return {
			ok: false,
			error: createProjectionError(
				"projection_history_capability_error",
				"Timeline projection requires a bound history port.",
				input.sourceRef,
			),
		};
	}

	const limitArg = input.plan.history.window.limitArg;
	const requestedLimit =
		limitArg === undefined ? null : toLimit(input.args[limitArg]);
	const limit = Math.min(
		requestedLimit ?? input.plan.history.window.defaultLimit,
		input.plan.history.window.maxLimit,
	);
	const afterArg = input.plan.history.window.afterEventKeyArg;
	const afterEventKey =
		afterArg === undefined
			? undefined
			: typeof input.args[afterArg] === "string"
				? (input.args[afterArg] as string)
				: undefined;
	const scanInput = {
		signals: input.plan.signals,
		orderBy: {
			field: input.plan.orderBy.field,
			direction: input.plan.orderBy.direction,
		},
		groupBy: input.plan.groupByField,
		limit,
		...(afterEventKey === undefined ? {} : { afterEventKey }),
	};

	if (input.asOf === null) {
		const result = await input.historyPort.scan(scanInput);
		return { ok: true, value: result };
	}

	if (input.historyPort.scanAsOf === undefined) {
		return {
			ok: false,
			error: createProjectionError(
				"projection_history_capability_error",
				"Timeline as_of query requires history.scan_as_of capability.",
				input.sourceRef,
				{ asOf: input.asOf },
			),
		};
	}

	const result = await input.historyPort.scanAsOf({
		...scanInput,
		asOf: input.asOf,
	});
	return { ok: true, value: result };
};
