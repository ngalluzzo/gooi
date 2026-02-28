/**
 * Canonical catalog search/detail/snapshot contract API.
 */
import * as detail from "./detail";
import * as errors from "./errors";
import * as model from "./model";
import * as search from "./search";
import * as snapshot from "./snapshot";

export type {
	CatalogError,
	CatalogErrorCode,
	CatalogErrorIssue,
} from "./errors";
export type {
	CatalogDetailInput,
	CatalogDetailResult,
	CatalogEntry,
	CatalogSearchInput,
	CatalogSearchQuery,
	CatalogSearchResult,
	CatalogSearchView,
	CatalogSnapshot,
	CatalogSnapshotExportInput,
	CatalogSnapshotResult,
} from "./model";

export const catalogContracts = Object.freeze({
	catalogEntrySchema: model.catalogEntrySchema,
	catalogSearchQuerySchema: model.catalogSearchQuerySchema,
	catalogSearchInputSchema: model.catalogSearchInputSchema,
	catalogSearchViewSchema: model.catalogSearchViewSchema,
	catalogSearchResultSchema: model.catalogSearchResultSchema,
	catalogDetailInputSchema: model.catalogDetailInputSchema,
	catalogDetailSuccessSchema: model.catalogDetailSuccessSchema,
	catalogDetailFailureSchema: model.catalogDetailFailureSchema,
	catalogDetailResultSchema: model.catalogDetailResultSchema,
	catalogSnapshotExportInputSchema: model.catalogSnapshotExportInputSchema,
	catalogSnapshotSchema: model.catalogSnapshotSchema,
	catalogSnapshotResultSchema: model.catalogSnapshotResultSchema,
	catalogErrorCodeSchema: errors.catalogErrorCodeSchema,
	catalogErrorIssueSchema: errors.catalogErrorIssueSchema,
	catalogErrorSchema: errors.catalogErrorSchema,
	createCatalogError: errors.createCatalogError,
	searchCatalog: search.searchCatalog,
	getCatalogDetail: detail.getCatalogDetail,
	exportCatalogSnapshot: snapshot.exportCatalogSnapshot,
});
