/**
 * Canonical catalog search/detail/snapshot contract API.
 */

import * as descriptor from "./descriptor";
import * as detail from "./detail";
import * as errors from "./errors";
import * as model from "./model";
import * as search from "./search";
import * as snapshot from "./snapshot";

export type {
	CatalogCapabilityExecutionDescriptor,
	CatalogDelegationRouteDescriptor,
	CatalogDescriptorVersion,
	CatalogProviderExecutionDescriptor,
	CatalogProviderExecutionDescriptorIndex,
} from "./descriptor";
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
	catalogDescriptorVersionSchema: descriptor.catalogDescriptorVersionSchema,
	catalogCapabilityExecutionDescriptorSchema:
		descriptor.catalogCapabilityExecutionDescriptorSchema,
	catalogDelegationRouteDescriptorSchema:
		descriptor.catalogDelegationRouteDescriptorSchema,
	catalogProviderExecutionDescriptorSchema:
		descriptor.catalogProviderExecutionDescriptorSchema,
	catalogProviderExecutionDescriptorIndexSchema:
		descriptor.catalogProviderExecutionDescriptorIndexSchema,
	catalogErrorCodeSchema: errors.catalogErrorCodeSchema,
	catalogErrorIssueSchema: errors.catalogErrorIssueSchema,
	catalogErrorSchema: errors.catalogErrorSchema,
	createCatalogError: errors.createCatalogError,
	resolveCatalogProviderExecutionDescriptor:
		descriptor.resolveCatalogProviderExecutionDescriptor,
	searchCatalog: search.searchCatalog,
	getCatalogDetail: detail.getCatalogDetail,
	exportCatalogSnapshot: snapshot.exportCatalogSnapshot,
});
