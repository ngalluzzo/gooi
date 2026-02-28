import type { ProjectionSemanticPageMeta } from "@gooi/kernel-contracts/projection-semantic";
import type { ProjectionTypedError } from "@gooi/projection-contracts/errors";
import type {
	ProjectionPaginationPlan,
	ProjectionSourceRef,
} from "@gooi/projection-contracts/plans";
import { createPaginationError } from "./errors";

interface PaginationInput {
	readonly rows: readonly Readonly<Record<string, unknown>>[];
	readonly pagination: ProjectionPaginationPlan;
	readonly args: Readonly<Record<string, unknown>>;
	readonly sourceRef: ProjectionSourceRef;
}

export interface PaginationResult {
	readonly rows: readonly Readonly<Record<string, unknown>>[];
	readonly meta: ProjectionSemanticPageMeta;
}

const toPositiveInteger = (value: unknown): number | null => {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
		return null;
	}
	return value;
};

/**
 * Applies deterministic page pagination over a sorted row set.
 */
export const applyPagination = (
	input: PaginationInput,
):
	| { readonly ok: true; readonly value: PaginationResult }
	| {
			readonly ok: false;
			readonly error: ProjectionTypedError;
	  } => {
	const requestedPage =
		toPositiveInteger(input.args[input.pagination.pageArg]) ??
		input.pagination.defaultPage;
	const requestedPageSize =
		toPositiveInteger(input.args[input.pagination.pageSizeArg]) ??
		input.pagination.defaultPageSize;

	if (requestedPageSize > input.pagination.maxPageSize) {
		return {
			ok: false,
			error: createPaginationError(
				"Requested page size exceeds maxPageSize.",
				input.sourceRef,
				{
					requestedPageSize,
					maxPageSize: input.pagination.maxPageSize,
				},
			),
		};
	}

	const totalRows = input.rows.length;
	const totalPages =
		totalRows === 0 ? 1 : Math.ceil(totalRows / requestedPageSize);
	if (requestedPage > totalPages && totalRows > 0) {
		return {
			ok: false,
			error: createPaginationError(
				"Requested page exceeds available pages.",
				input.sourceRef,
				{ requestedPage, totalPages },
			),
		};
	}

	const start = (requestedPage - 1) * requestedPageSize;
	const end = start + requestedPageSize;
	return {
		ok: true,
		value: {
			rows: input.rows.slice(start, end),
			meta: {
				mode: "page",
				page: requestedPage,
				pageSize: requestedPageSize,
				totalRows,
				totalPages,
			},
		},
	};
};
