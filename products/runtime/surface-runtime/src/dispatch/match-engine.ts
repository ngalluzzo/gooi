import type {
	CompiledDispatchHandler,
	DispatchClause,
	DispatchRequest,
	DispatchTraceStep,
} from "@gooi/surface-contracts/dispatch";
import { matchPathTemplate } from "./path-template";

const isUnsafePathSegment = (segment: string): boolean =>
	segment === "__proto__" ||
	segment === "prototype" ||
	segment === "constructor";

const readRecordPath = (
	record: Readonly<Record<string, unknown>>,
	path: string,
): unknown => {
	const segments = path.split(".");
	let cursor: unknown = record;
	for (const segment of segments) {
		if (isUnsafePathSegment(segment)) {
			return undefined;
		}
		if (cursor === null || typeof cursor !== "object") {
			return undefined;
		}
		const current = cursor as Readonly<Record<string, unknown>>;
		if (!Object.hasOwn(current, segment)) {
			return undefined;
		}
		cursor = current[segment];
	}
	return cursor;
};

const isClauseMatch = (
	request: DispatchRequest,
	clause: DispatchClause,
): boolean => {
	const actual = readRecordPath(request.attributes, clause.key);
	if (clause.op === "exists") {
		return actual !== undefined;
	}
	if (clause.op === "prefix") {
		return typeof actual === "string" && typeof clause.value === "string"
			? actual.startsWith(clause.value)
			: false;
	}
	if (clause.op === "path_template") {
		return typeof actual === "string" && typeof clause.value === "string"
			? matchPathTemplate(clause.value, actual)
			: false;
	}
	if (clause.key === "method") {
		return (
			typeof actual === "string" &&
			typeof clause.value === "string" &&
			actual.toUpperCase() === clause.value.toUpperCase()
		);
	}
	return Object.is(actual, clause.value);
};

const sortHandlers = (
	handlers: CompiledDispatchHandler[],
): CompiledDispatchHandler[] =>
	[...handlers].sort(
		(left, right) =>
			right.specificity - left.specificity ||
			left.handlerId.localeCompare(right.handlerId),
	);

export interface DispatchMatchEngineResult {
	readonly candidates: CompiledDispatchHandler[];
	readonly matched: CompiledDispatchHandler[];
	readonly steps: DispatchTraceStep[];
}

export const runDispatchMatchEngine = (input: {
	readonly request: DispatchRequest;
	readonly handlers: CompiledDispatchHandler[];
}): DispatchMatchEngineResult => {
	const candidates = sortHandlers(input.handlers);
	const steps: DispatchTraceStep[] = [];
	const matched: CompiledDispatchHandler[] = [];

	for (const handler of candidates) {
		steps.push({
			handlerId: handler.handlerId,
			decision: "candidate_considered",
			reason: "Candidate considered in deterministic specificity order.",
		});
		const surfaceMatch =
			handler.matcher.surfaceType === input.request.surfaceType;
		const clauseMatch = handler.matcher.clauses.every((clause) =>
			isClauseMatch(input.request, clause),
		);
		if (surfaceMatch && clauseMatch) {
			matched.push(handler);
			steps.push({
				handlerId: handler.handlerId,
				decision: "candidate_matched",
				reason: "All matcher clauses matched request attributes.",
			});
			continue;
		}
		steps.push({
			handlerId: handler.handlerId,
			decision: "candidate_rejected",
			reason: !surfaceMatch
				? "Handler surfaceType does not match request surfaceType."
				: "At least one matcher clause did not match request attributes.",
		});
	}
	return {
		candidates,
		matched,
		steps,
	};
};
