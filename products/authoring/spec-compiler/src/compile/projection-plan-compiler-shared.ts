import type { CompileDiagnostic } from "@gooi/app-spec-contracts/compiled";
import type {
	ProjectionFieldSelection,
	ProjectionJoinEdgePlan,
	ProjectionPaginationPlan,
	ProjectionSortRule,
	TimelineReducerOperation,
} from "@gooi/projection-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";
import {
	parseFieldSelectionString,
	parseJoinOnExpression,
	parseSortRuleObject,
	parseTimelineReducerObject,
} from "./projection-plan-compiler-north-star";

export const projectionError = (
	path: string,
	message: string,
): CompileDiagnostic => ({
	severity: "error",
	code: "projection_plan_invalid_error",
	path,
	message,
});

const asNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const parsePagination = (
	value: unknown,
	path: string,
	diagnostics: CompileDiagnostic[],
): ProjectionPaginationPlan | null => {
	const record = asRecord(value);
	const mode = asString(record?.mode);
	const pageArg = asString(record?.pageArg) ?? asString(record?.page_arg);
	const pageSizeArg =
		asString(record?.pageSizeArg) ?? asString(record?.page_size_arg);
	const defaultPage =
		asNumber(record?.defaultPage) ?? asNumber(record?.default_page) ?? 1;
	const defaultPageSize =
		asNumber(record?.defaultPageSize) ?? asNumber(record?.default_page_size);
	const maxPageSize =
		asNumber(record?.maxPageSize) ?? asNumber(record?.max_page_size);
	if (
		mode !== "page" ||
		pageArg === undefined ||
		pageSizeArg === undefined ||
		defaultPage === undefined ||
		defaultPageSize === undefined ||
		maxPageSize === undefined
	) {
		diagnostics.push(
			projectionError(
				path,
				"Projection pagination must provide mode/pageArg/pageSizeArg/defaultPage/defaultPageSize/maxPageSize.",
			),
		);
		return null;
	}
	return {
		mode,
		pageArg,
		pageSizeArg,
		defaultPage,
		defaultPageSize,
		maxPageSize,
	};
};

export const parseSortRules = (
	value: unknown,
	path: string,
	diagnostics: CompileDiagnostic[],
): readonly ProjectionSortRule[] => {
	if (!Array.isArray(value)) {
		const normalizedSort = parseSortRuleObject(value);
		if (normalizedSort !== undefined) {
			return normalizedSort;
		}
		diagnostics.push(
			projectionError(
				path,
				"Projection sort must be an array or include default_by/default_order.",
			),
		);
		return [];
	}
	const rules: ProjectionSortRule[] = [];
	for (let index = 0; index < value.length; index += 1) {
		const record = asRecord(value[index]);
		const field = asString(record?.field);
		const direction = asString(record?.direction);
		if (field === undefined || (direction !== "asc" && direction !== "desc")) {
			diagnostics.push(
				projectionError(
					`${path}.${index}`,
					"Sort rules require field and direction (asc|desc).",
				),
			);
			continue;
		}
		rules.push({ field, direction });
	}
	return [...rules].sort((left, right) =>
		left.field.localeCompare(right.field),
	);
};

export const parseFieldSelections = (
	value: unknown,
	path: string,
	diagnostics: CompileDiagnostic[],
): readonly ProjectionFieldSelection[] => {
	if (!Array.isArray(value)) {
		diagnostics.push(
			projectionError(path, "Projection fields must be an array."),
		);
		return [];
	}
	const selections: ProjectionFieldSelection[] = [];
	for (let index = 0; index < value.length; index += 1) {
		const parsedString = parseFieldSelectionString(value[index]);
		if (parsedString !== undefined) {
			selections.push(parsedString);
			continue;
		}
		const record = asRecord(value[index]);
		const source = asString(record?.source);
		const as = asString(record?.as);
		if (source === undefined || as === undefined) {
			diagnostics.push(
				projectionError(
					`${path}.${index}`,
					"Projection fields require source and as.",
				),
			);
			continue;
		}
		selections.push({ source, as });
	}
	return [...selections].sort((left, right) => left.as.localeCompare(right.as));
};

export const parseJoinEdges = (
	value: unknown,
	path: string,
	diagnostics: CompileDiagnostic[],
): readonly ProjectionJoinEdgePlan[] => {
	if (!Array.isArray(value)) {
		diagnostics.push(
			projectionError(path, "Projection joins must be an array."),
		);
		return [];
	}
	const edges: ProjectionJoinEdgePlan[] = [];
	for (let index = 0; index < value.length; index += 1) {
		const record = asRecord(value[index]);
		const collectionId =
			asString(record?.collectionId) ?? asString(record?.collection);
		const alias = asString(record?.alias) ?? asString(record?.as);
		const type = asString(record?.type);
		const on = parseJoinOnExpression(record?.on);
		const leftField = on?.leftField;
		const rightField = on?.rightField;
		if (
			collectionId === undefined ||
			alias === undefined ||
			(type !== "left" && type !== "inner") ||
			leftField === undefined ||
			rightField === undefined
		) {
			diagnostics.push(
				projectionError(
					`${path}.${index}`,
					"Join edges require collectionId/alias/type/on.leftField/on.rightField.",
				),
			);
			continue;
		}
		edges.push({
			collectionId,
			alias,
			type,
			on: { leftField, rightField },
		});
	}
	return [...edges].sort((left, right) =>
		left.alias.localeCompare(right.alias),
	);
};

export const parseTimelineReducers = (
	value: unknown,
	path: string,
	diagnostics: CompileDiagnostic[],
): Readonly<Record<string, readonly TimelineReducerOperation[]>> => {
	if (value === undefined || value === null) {
		return {};
	}
	const reducers = asRecord(value);
	if (reducers === undefined) {
		diagnostics.push(
			projectionError(
				path,
				"Timeline reducers must be a record of operation arrays.",
			),
		);
		return {};
	}
	const output: Record<string, readonly TimelineReducerOperation[]> = {};
	for (const [signalId, operations] of Object.entries(reducers)) {
		if (!Array.isArray(operations)) {
			const parsedObject = parseTimelineReducerObject(operations);
			if (parsedObject !== undefined) {
				output[signalId] = parsedObject;
				continue;
			}
			diagnostics.push(
				projectionError(
					`${path}.${signalId}`,
					"Timeline reducer operations must be an array or reducer object.",
				),
			);
			continue;
		}
		output[signalId] = operations as readonly TimelineReducerOperation[];
	}
	return Object.fromEntries(
		Object.entries(output).sort(([left], [right]) => left.localeCompare(right)),
	);
};
