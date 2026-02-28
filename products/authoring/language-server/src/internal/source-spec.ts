export const asRecord = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined =>
	value !== null && typeof value === "object"
		? (value as Readonly<Record<string, unknown>>)
		: undefined;

export const asString = (value: unknown): string | undefined =>
	typeof value === "string" && value.length > 0 ? value : undefined;

const asArray = (value: unknown): readonly unknown[] =>
	Array.isArray(value) ? value : [];

const sortedUnique = (values: readonly string[]): string[] =>
	[...new Set(values)].sort((left, right) => left.localeCompare(right));

const sourceSpecRoot = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined => asRecord(value);

export const sourceSpecRouteIds = (value: unknown): string[] => {
	const routes = asArray(sourceSpecRoot(value)?.routes);
	return sortedUnique(
		routes
			.map((entry) => asString(asRecord(entry)?.id))
			.filter((entry): entry is string => entry !== undefined),
	);
};

export const sourceSpecQueryIds = (value: unknown): string[] => {
	const queries = asArray(sourceSpecRoot(value)?.queries);
	return sortedUnique(
		queries
			.map((entry) => asString(asRecord(entry)?.id))
			.filter((entry): entry is string => entry !== undefined),
	);
};

export const sourceSpecMutationIds = (value: unknown): string[] => {
	const mutations = asArray(sourceSpecRoot(value)?.mutations);
	return sortedUnique(
		mutations
			.map((entry) => asString(asRecord(entry)?.id))
			.filter((entry): entry is string => entry !== undefined),
	);
};

export const sourceSpecPersonaIds = (value: unknown): string[] =>
	sortedUnique(Object.keys(asRecord(sourceSpecRoot(value)?.personas) ?? {}));

export const sourceSpecScenarioIds = (value: unknown): string[] =>
	sortedUnique(Object.keys(asRecord(sourceSpecRoot(value)?.scenarios) ?? {}));

export const sourceSpecFlowIds = (value: unknown): string[] =>
	sortedUnique(
		Object.keys(asRecord(asRecord(sourceSpecRoot(value)?.domain)?.flows) ?? {}),
	);

export const sourceSpecProjectionIds = (value: unknown): string[] =>
	sortedUnique(
		Object.keys(
			asRecord(asRecord(sourceSpecRoot(value)?.domain)?.projections) ?? {},
		),
	);

export const sourceSpecSignalIds = (value: unknown): string[] =>
	sortedUnique(
		Object.keys(
			asRecord(asRecord(sourceSpecRoot(value)?.domain)?.signals) ?? {},
		),
	);

export const sourceSpecCaptureSources = Object.freeze([
	"last_trigger_output",
	"last_signal_payload",
	"last_expectation_output",
	"context",
]);

export const sourceSpecGuardPolicies = Object.freeze([
	"abort",
	"fail_action",
	"log_and_continue",
	"emit_violation",
]);

export const sourceSpecReachabilityModes = Object.freeze([
	"local",
	"delegated",
	"unreachable",
]);
