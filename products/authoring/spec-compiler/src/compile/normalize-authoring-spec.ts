import type { AuthoringEntrypointSpec } from "@gooi/app-spec-contracts/spec";

const asRecord = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined =>
	value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Readonly<Record<string, unknown>>)
		: undefined;

const sortRecord = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

const withAlias = (
	record: Readonly<Record<string, unknown>>,
	canonicalKey: string,
	aliasKeys: readonly string[],
): Readonly<Record<string, unknown>> => {
	if (record[canonicalKey] !== undefined) {
		return record;
	}
	for (const aliasKey of aliasKeys) {
		const aliasValue = record[aliasKey];
		if (aliasValue === undefined) {
			continue;
		}
		return {
			...record,
			[canonicalKey]: aliasValue,
		};
	}
	return record;
};

const normalizePaginationAliases = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined => {
	const pagination = asRecord(value);
	if (pagination === undefined) {
		return undefined;
	}
	let next = pagination;
	next = withAlias(next, "pageArg", ["page_arg"]);
	next = withAlias(next, "pageSizeArg", ["page_size_arg"]);
	next = withAlias(next, "defaultPage", ["default_page"]);
	next = withAlias(next, "defaultPageSize", ["default_page_size"]);
	next = withAlias(next, "maxPageSize", ["max_page_size"]);
	return next;
};

const normalizePrimaryAliases = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined => {
	const primary = asRecord(value);
	if (primary === undefined) {
		return undefined;
	}
	let next = primary;
	next = withAlias(next, "collectionId", ["collection"]);
	next = withAlias(next, "alias", ["as"]);
	return next;
};

const normalizeJoinEdgeAliases = (value: unknown): unknown => {
	if (!Array.isArray(value)) {
		return value;
	}
	return value.map((entry) => {
		const join = asRecord(entry);
		if (join === undefined) {
			return entry;
		}
		let next = join;
		next = withAlias(next, "collectionId", ["collection"]);
		next = withAlias(next, "alias", ["as"]);
		return next;
	});
};

const normalizeProjectionAliases = (
	value: unknown,
): Readonly<Record<string, unknown>> | undefined => {
	const projection = asRecord(value);
	if (projection === undefined) {
		return undefined;
	}

	let next = projection;
	next = withAlias(next, "collectionId", ["collection"]);
	next = withAlias(next, "groupBy", ["group_by"]);
	next = withAlias(next, "groupByField", ["group_by_field"]);
	next = withAlias(next, "orderBy", ["order_by"]);
	next = withAlias(next, "joins", ["join"]);
	next = withAlias(next, "reducers", ["when"]);
	next = withAlias(next, "signalReplay", ["rebuild"]);
	next = withAlias(next, "history", ["persist"]);

	const pagination = normalizePaginationAliases(next.pagination);
	const primary = normalizePrimaryAliases(next.primary);
	const joins = normalizeJoinEdgeAliases(next.joins);
	return {
		...next,
		...(pagination === undefined ? {} : { pagination }),
		...(primary === undefined ? {} : { primary }),
		...(joins === undefined ? {} : { joins }),
	};
};

/**
 * Normalizes known authoring aliases into canonical compiler input shape.
 */
export const normalizeAuthoringSpec = (
	spec: AuthoringEntrypointSpec,
): AuthoringEntrypointSpec => {
	const projections = asRecord(spec.domain.projections) ?? {};
	const normalizedProjections = Object.fromEntries(
		Object.keys(projections)
			.sort((left, right) => left.localeCompare(right))
			.map((projectionId) => [
				projectionId,
				normalizeProjectionAliases(projections[projectionId]) ??
					projections[projectionId],
			]),
	);

	return {
		...spec,
		domain: {
			...spec.domain,
			projections: sortRecord(normalizedProjections),
		},
	};
};
