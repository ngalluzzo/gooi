import type {
	CompileDiagnostic,
	CompiledEntrypoint,
	CompiledInputField,
} from "@gooi/app-spec-contracts/compiled";
import type { AuthoringEntrypointSpec } from "@gooi/app-spec-contracts/spec";
import type { JsonValue } from "@gooi/contract-primitives/json";
import { stableStringify } from "@gooi/stable-json";
import type {
	CompiledDispatchHandler,
	DispatchEntrypointKind,
	DispatchMatcher,
} from "@gooi/surface-contracts/dispatch";
import { dispatch as surfaceDispatch } from "@gooi/surface-contracts/dispatch";

const scalarTypes = new Set([
	"text",
	"id",
	"int",
	"number",
	"bool",
	"timestamp",
]);

const scorePath = (value: string): number =>
	value
		.split("/")
		.filter((segment) => segment.length > 0)
		.reduce((total, segment) => {
			if (segment.startsWith(":")) {
				return total + 10;
			}
			if (segment === "*") {
				return total + 1;
			}
			return total + 100;
		}, 0);

export const dispatchKinds = ["query", "mutation", "route"] as const;
type DispatchClause = DispatchMatcher["clauses"][number];
type MatcherResolution =
	| { readonly kind: "ok"; readonly matcher: DispatchMatcher }
	| { readonly kind: "invalid"; readonly message: string }
	| { readonly kind: "missing" };

const sortClauses = (
	clauses: readonly DispatchClause[],
): readonly DispatchClause[] =>
	[...clauses].sort(
		(left, right) =>
			left.key.localeCompare(right.key) ||
			left.op.localeCompare(right.op) ||
			stableStringify(left.value ?? null).localeCompare(
				stableStringify(right.value ?? null),
			),
	);

export const routeInputFieldContracts = (
	spec: AuthoringEntrypointSpec,
	diagnostics: CompileDiagnostic[],
): Readonly<Record<string, Readonly<Record<string, CompiledInputField>>>> => {
	const routes: Record<
		string,
		Readonly<Record<string, CompiledInputField>>
	> = {};
	for (const [index, route] of spec.routes.entries()) {
		const fields: Record<string, CompiledInputField> = {};
		for (const [fieldName, annotation] of Object.entries(route.in ?? {})) {
			const required = annotation.endsWith("!");
			const scalar = required ? annotation.slice(0, -1) : annotation;
			if (!scalarTypes.has(scalar)) {
				diagnostics.push({
					severity: "error",
					code: "unsupported_scalar_type",
					path: `routes.${index}.in.${fieldName}`,
					message: `Unsupported scalar type annotation \`${annotation}\`.`,
				});
				continue;
			}
			fields[fieldName] = {
				scalarType: scalar as CompiledInputField["scalarType"],
				required,
			};
		}
		routes[route.id] = fields;
	}
	return routes;
};

const parseExtensionMatcher = (
	binding: Readonly<Record<string, unknown>>,
): MatcherResolution | null => {
	const extension =
		binding["x-dispatch"] !== null && typeof binding["x-dispatch"] === "object"
			? (binding["x-dispatch"] as Readonly<Record<string, unknown>>)
			: null;
	const candidate = extension?.matcher;
	if (candidate === undefined) {
		return null;
	}
	const parsed = surfaceDispatch.dispatchMatcherSchema.safeParse(candidate);
	if (!parsed.success) {
		return {
			kind: "invalid",
			message: parsed.error.issues.map((issue) => issue.message).join("; "),
		};
	}
	return {
		kind: "ok",
		matcher: {
			...parsed.data,
			clauses: [...sortClauses(parsed.data.clauses)],
		},
	};
};

const normalizeMethod = (value: string): string => value.trim().toUpperCase();

const normalizePath = (value: string): string => value.trim();

export const matcherFromSurfaceBinding = (
	surfaceId: string,
	kind: DispatchEntrypointKind,
	entrypointId: string,
	binding: Readonly<Record<string, unknown>>,
): MatcherResolution => {
	const extensionMatcher = parseExtensionMatcher(binding);
	if (extensionMatcher !== null) {
		return extensionMatcher;
	}

	const clauses: DispatchClause[] = [];
	if (typeof binding.method === "string") {
		clauses.push({
			key: "method",
			op: "eq",
			value: normalizeMethod(binding.method),
		});
	}
	if (typeof binding.path === "string") {
		clauses.push({
			key: "path",
			op: "path_template",
			value: normalizePath(binding.path),
		});
	}
	if (typeof binding.route === "string") {
		clauses.push({ key: "routeId", op: "eq", value: binding.route });
	}
	if (typeof binding.source === "string") {
		clauses.push({ key: "sourceId", op: "eq", value: binding.source });
	}
	const command =
		binding.command !== null && typeof binding.command === "object"
			? (binding.command as Readonly<Record<string, unknown>>)
			: null;
	if (typeof command?.path === "string") {
		clauses.push({
			key: "command.path",
			op: "eq",
			value: command.path.trim(),
		});
	}
	const when =
		command?.when !== null && typeof command?.when === "object"
			? (command.when as Readonly<Record<string, unknown>>)
			: null;
	const whenFlags =
		when?.flags !== null && typeof when?.flags === "object"
			? (when.flags as Record<string, JsonValue>)
			: undefined;
	for (const flagKey of Object.keys(whenFlags ?? {}).sort((left, right) =>
		left.localeCompare(right),
	)) {
		clauses.push({
			key: `flags.${flagKey}`,
			op: "eq",
			value: whenFlags?.[flagKey],
		});
	}

	if (clauses.length === 0 && kind === "route") {
		clauses.push({ key: "routeId", op: "eq", value: entrypointId });
	}

	if (clauses.length === 0) {
		return { kind: "missing" };
	}

	return {
		kind: "ok",
		matcher: {
			surfaceType: surfaceId,
			clauses: [...sortClauses(clauses)],
		},
	};
};

const normalizeSignatureValue = (clause: DispatchClause): string => {
	if (clause.op === "exists") {
		return "*";
	}
	if (clause.op === "path_template" && typeof clause.value === "string") {
		return clause.value.replace(/:[^/]+/g, ":param");
	}
	return stableStringify(clause.value ?? null);
};

export const matcherSignature = (matcher: DispatchMatcher): string => {
	const clauses = [...sortClauses(matcher.clauses)].map(
		(clause) => `${clause.key}:${clause.op}:${normalizeSignatureValue(clause)}`,
	);
	return `${matcher.surfaceType}|${clauses.join("|")}`;
};

export const matcherSpecificity = (matcher: DispatchMatcher): number => {
	const clauseScore = (clause: DispatchClause): number => {
		if (clause.op === "exists") {
			return 5;
		}
		if (clause.op === "prefix" && typeof clause.value === "string") {
			return 20 + clause.value.length;
		}
		if (clause.op === "path_template" && typeof clause.value === "string") {
			return 100 + scorePath(clause.value);
		}
		return 40;
	};
	const base = matcher.clauses.reduce(
		(total, clause) => total + clauseScore(clause),
		0,
	);
	const bias = (matcher.priorityBias ?? 0) * 1_000;
	return Math.max(0, base + bias);
};

export const sortHandlers = (
	handlers: readonly CompiledDispatchHandler[],
): readonly CompiledDispatchHandler[] =>
	[...handlers].sort(
		(left, right) =>
			right.specificity - left.specificity ||
			left.handlerId.localeCompare(right.handlerId),
	);

export const resolveEntrypointFields = (
	kind: DispatchEntrypointKind,
	entrypointId: string,
	entrypoints: Readonly<Record<string, CompiledEntrypoint>>,
	routeInputs: Readonly<
		Record<string, Readonly<Record<string, CompiledInputField>>>
	>,
): Readonly<Record<string, CompiledInputField>> | undefined =>
	kind === "route"
		? routeInputs[entrypointId]
		: entrypoints[`${kind}:${entrypointId}`]?.inputFields;
