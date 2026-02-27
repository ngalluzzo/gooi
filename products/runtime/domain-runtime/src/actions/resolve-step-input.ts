import type {
	DomainActionStepInputPlan,
	DomainValueSource,
} from "../contracts/action-plan";
import {
	createDomainRuntimeError,
	type DomainRuntimeTypedError,
} from "../contracts/errors";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

const readInputPath = (
	input: Readonly<Record<string, unknown>>,
	path: string,
): unknown => {
	const segments = path.split(".").filter((segment) => segment.length > 0);
	if (segments.length === 0) {
		return undefined;
	}
	let cursor: unknown = input;
	for (const segment of segments) {
		if (!isRecord(cursor)) {
			return undefined;
		}
		cursor = cursor[segment];
	}
	return cursor;
};

const resolveSourceValue = (
	source: DomainValueSource,
	input: Readonly<Record<string, unknown>>,
): unknown => {
	if (source.kind === "literal") {
		return source.value;
	}
	return readInputPath(input, source.path);
};

export type StepInputResolutionResult =
	| { readonly ok: true; readonly value: Readonly<Record<string, unknown>> }
	| { readonly ok: false; readonly error: DomainRuntimeTypedError };

/**
 * Resolves one deterministic action-step input payload.
 */
export const resolveStepInput = (
	stepId: string,
	plan: DomainActionStepInputPlan,
	input: Readonly<Record<string, unknown>>,
): StepInputResolutionResult => {
	const resolved: Record<string, unknown> = {};
	for (const [field, source] of Object.entries(plan.fields)) {
		const explicit = resolveSourceValue(source, input);
		if (explicit === null) {
			resolved[field] = null;
			continue;
		}
		if (explicit !== undefined) {
			resolved[field] = explicit;
			continue;
		}
		if (plan.defaults && field in plan.defaults) {
			resolved[field] = plan.defaults[field];
		}
	}

	const unknownDefaults = Object.keys(plan.defaults ?? {}).filter(
		(defaultKey) => plan.fields[defaultKey] === undefined,
	);
	if (unknownDefaults.length > 0) {
		return {
			ok: false,
			error: createDomainRuntimeError(
				"action_step_input_error",
				"Action step defaults reference undeclared fields.",
				{
					stepId,
					unknownDefaults,
				},
			),
		};
	}

	return { ok: true, value: resolved };
};
