import type { JsonValue } from "@gooi/contract-primitives/json";
import type {
	ProjectionFieldSelection,
	ProjectionJoinEdgePlan,
	ProjectionSortRule,
	TimelineReducerOperation,
} from "@gooi/projection-contracts/plans";

const asRecord = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Readonly<Record<string, unknown>>)
		: undefined;

const asString = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

const readVarPath = (value: unknown): string | undefined => {
	const record = asRecord(value);
	return asString(record?.var);
};

const aliasFromSource = (source: string): string => {
	const leaf = source.split(".").at(-1);
	return leaf === undefined || leaf.length === 0 ? source : leaf;
};

const normalizeSignalPath = (path: string): string => {
	const suffix = path.slice("signal.".length);
	if (suffix === "emitted_at") {
		return "emittedAt";
	}
	if (suffix === "trace_id") {
		return "traceId";
	}
	if (suffix === "event_key") {
		return "eventKey";
	}
	if (suffix === "signal_name") {
		return "signalName";
	}
	return suffix;
};

export const parseSortRuleObject = (
	value: unknown,
): readonly ProjectionSortRule[] | undefined => {
	const sort = asRecord(value);
	if (sort === undefined) {
		return undefined;
	}
	const field = asString(sort.defaultBy) ?? asString(sort.default_by);
	const direction =
		asString(sort.defaultOrder) ?? asString(sort.default_order) ?? "asc";
	if (field === undefined || (direction !== "asc" && direction !== "desc")) {
		return undefined;
	}
	return [{ field, direction }];
};

export const parseFieldSelectionString = (
	value: unknown,
): ProjectionFieldSelection | undefined => {
	if (typeof value !== "string") {
		return undefined;
	}
	const match = value.match(/^\s*(.+?)\s+as\s+([A-Za-z0-9_.$-]+)\s*$/);
	if (match !== null) {
		const source = match[1]?.trim();
		const as = match[2]?.trim();
		if (source !== undefined && as !== undefined && source.length > 0) {
			return { source, as };
		}
		return undefined;
	}
	const source = value.trim();
	if (source.length === 0) {
		return undefined;
	}
	return {
		source,
		as: aliasFromSource(source),
	};
};

export const parseJoinOnExpression = (
	value: unknown,
): ProjectionJoinEdgePlan["on"] | undefined => {
	const on = asRecord(value);
	const leftField = asString(on?.leftField);
	const rightField = asString(on?.rightField);
	if (leftField !== undefined && rightField !== undefined) {
		return { leftField, rightField };
	}
	const equals = Array.isArray(on?.["=="]) ? on?.["=="] : undefined;
	if (equals === undefined || equals.length !== 2) {
		return undefined;
	}
	const leftVar = readVarPath(equals[0]);
	const rightVar = readVarPath(equals[1]);
	if (leftVar === undefined || rightVar === undefined) {
		return undefined;
	}
	return {
		leftField: leftVar,
		rightField: rightVar,
	};
};

const parseReducerExpression = (
	field: string,
	value: unknown,
): TimelineReducerOperation | undefined => {
	const expression = asRecord(value)?.$expr ?? value;
	const exprRecord = asRecord(expression);
	const plus = Array.isArray(exprRecord?.["+"]) ? exprRecord?.["+"] : undefined;
	if (plus !== undefined && plus.length === 2) {
		const acc = readVarPath(plus[0]);
		const delta = asNumber(plus[1]) ?? 1;
		if (acc === `acc.${field}`) {
			return { op: "inc", field, value: delta };
		}
	}
	const minus = Array.isArray(exprRecord?.["-"])
		? exprRecord?.["-"]
		: undefined;
	if (minus !== undefined && minus.length === 2) {
		const acc = readVarPath(minus[0]);
		const delta = asNumber(minus[1]) ?? 1;
		if (acc === `acc.${field}`) {
			return { op: "dec", field, value: delta };
		}
	}
	const varPath = readVarPath(expression);
	if (varPath !== undefined) {
		if (varPath.startsWith("payload.")) {
			return {
				op: "set",
				field,
				valueFrom: "payload",
				path: varPath.slice("payload.".length),
			};
		}
		if (varPath.startsWith("signal.")) {
			return {
				op: "set",
				field,
				valueFrom: "signal",
				path: normalizeSignalPath(varPath),
			};
		}
	}
	return {
		op: "set",
		field,
		valueFrom: "literal",
		value: expression as JsonValue,
	};
};

export const parseTimelineReducerObject = (
	value: unknown,
): readonly TimelineReducerOperation[] | undefined => {
	const reducer = asRecord(value);
	if (reducer === undefined) {
		return undefined;
	}
	const operations: TimelineReducerOperation[] = [];
	for (const [field, fieldValue] of Object.entries(reducer)) {
		const operation = parseReducerExpression(field, fieldValue);
		if (operation !== undefined) {
			operations.push(operation);
		}
	}
	return operations;
};
