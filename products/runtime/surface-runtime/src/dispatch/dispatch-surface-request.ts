import type {
	CompiledDispatchHandler,
	CompiledSurfaceDispatchPlanSet,
	DispatchClause,
	DispatchError,
	DispatchRequest,
	DispatchTraceEnvelope,
	DispatchTraceStep,
} from "@gooi/surface-contracts/dispatch";
import { parseDispatchRequest } from "@gooi/surface-contracts/dispatch";
import { matchPathTemplate } from "./path-template";

const readRecordPath = (
	record: Readonly<Record<string, unknown>>,
	path: string,
): unknown => {
	const segments = path.split(".");
	let cursor: unknown = record;
	for (const segment of segments) {
		if (cursor === null || typeof cursor !== "object") {
			return undefined;
		}
		cursor = (cursor as Readonly<Record<string, unknown>>)[segment];
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

const buildDispatchError = (
	error: DispatchError,
	trace: Omit<DispatchTraceEnvelope, "error">,
): {
	readonly ok: false;
	readonly error: DispatchError;
	readonly trace: DispatchTraceEnvelope;
} => ({
	ok: false,
	error,
	trace: {
		...trace,
		error,
	},
});

export interface SurfaceDispatchSelection {
	readonly handlerId: string;
	readonly surfaceId: string;
	readonly entrypointKind: "query" | "mutation" | "route";
	readonly entrypointId: string;
	readonly fieldBindings: Readonly<Record<string, string>>;
}

export type DispatchSurfaceRequestResult =
	| {
			readonly ok: true;
			readonly selection: SurfaceDispatchSelection;
			readonly trace: DispatchTraceEnvelope;
	  }
	| {
			readonly ok: false;
			readonly error: DispatchError;
			readonly trace: DispatchTraceEnvelope;
	  };

export interface DispatchSurfaceRequestInput {
	readonly dispatchPlans: CompiledSurfaceDispatchPlanSet;
	readonly request: DispatchRequest;
}

/**
 * Resolves one dispatch request to one canonical handler target with deterministic precedence.
 */
export const dispatchSurfaceRequest = (
	input: DispatchSurfaceRequestInput,
): DispatchSurfaceRequestResult => {
	const request = parseDispatchRequest(input.request);
	const plan = input.dispatchPlans.plans[request.surfaceId];
	const candidates = sortHandlers(plan?.handlers ?? []);
	const steps: DispatchTraceStep[] = [];
	const matched: CompiledDispatchHandler[] = [];

	for (const handler of candidates) {
		steps.push({
			handlerId: handler.handlerId,
			decision: "candidate_considered",
			reason: "Candidate considered in deterministic specificity order.",
		});
		const surfaceMatch = handler.matcher.surfaceType === request.surfaceType;
		const clauseMatch = handler.matcher.clauses.every((clause) =>
			isClauseMatch(request, clause),
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

	const traceBase: Omit<DispatchTraceEnvelope, "error"> = {
		surfaceId: request.surfaceId,
		candidates,
		steps,
	};
	if (matched.length === 0) {
		steps.push({
			handlerId: "none",
			decision: "no_match",
			reason: "No candidates matched the request.",
		});
		return buildDispatchError(
			{
				code: "dispatch_not_found_error",
				message: "No dispatch handler matched the request.",
				details: {
					surfaceId: request.surfaceId,
					surfaceType: request.surfaceType,
					candidateCount: candidates.length,
				},
			},
			traceBase,
		);
	}

	const topSpecificity = matched[0]?.specificity ?? 0;
	const topMatches = matched.filter(
		(handler) => handler.specificity === topSpecificity,
	);
	if (topMatches.length > 1) {
		steps.push(
			...topMatches.map((handler) => ({
				handlerId: handler.handlerId,
				decision: "ambiguous_top_match" as const,
				reason: "Multiple top-ranked handlers matched with equal specificity.",
			})),
		);
		return buildDispatchError(
			{
				code: "dispatch_ambiguous_error",
				message: "Dispatch request matched multiple top-ranked handlers.",
				details: {
					surfaceId: request.surfaceId,
					surfaceType: request.surfaceType,
					handlerIds: topMatches.map((handler) => handler.handlerId),
					specificity: topSpecificity,
				},
			},
			traceBase,
		);
	}

	const winner = topMatches[0];
	if (winner === undefined) {
		return buildDispatchError(
			{
				code: "dispatch_transport_error",
				message: "Dispatch winner resolution failed unexpectedly.",
			},
			traceBase,
		);
	}
	steps.push({
		handlerId: winner.handlerId,
		decision: "winner_selected",
		reason: "Highest specificity matched candidate selected deterministically.",
	});
	return {
		ok: true,
		selection: {
			handlerId: winner.handlerId,
			surfaceId: winner.surfaceId,
			entrypointKind: winner.target.entrypointKind,
			entrypointId: winner.target.entrypointId,
			fieldBindings: winner.target.fieldBindings,
		},
		trace: {
			...traceBase,
			selectedHandlerId: winner.handlerId,
		},
	};
};
