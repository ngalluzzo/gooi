import {
	type CatalogDetailInput,
	type CatalogDetailResult,
	type CatalogEntry,
	type CatalogSearchInput,
	type CatalogSearchQuery,
	type CatalogSearchResult,
	type CatalogSearchView,
	type CatalogSnapshot,
	type CatalogSnapshotExportInput,
	type CatalogSnapshotResult,
	catalogContracts,
} from "@gooi/marketplace-contracts/catalog";

export type MarketplaceCatalogEntry = CatalogEntry;
export type MarketplaceCatalogSearchQuery = CatalogSearchQuery;
export type MarketplaceCatalogSearchInput = CatalogSearchInput;
export type MarketplaceCatalogSearchView = CatalogSearchView;
export type MarketplaceCatalogSearchResult = CatalogSearchResult;
export type MarketplaceCatalogDetailInput = CatalogDetailInput;
export type MarketplaceCatalogDetailResult = CatalogDetailResult;
export type MarketplaceCatalogSnapshot = CatalogSnapshot;
export type MarketplaceCatalogSnapshotExportInput = CatalogSnapshotExportInput;
export type MarketplaceCatalogSnapshotResult = CatalogSnapshotResult;

export const searchMarketplaceCatalog = catalogContracts.searchCatalog;
export const getMarketplaceCatalogDetail = catalogContracts.getCatalogDetail;
export const exportMarketplaceCatalogSnapshot =
	catalogContracts.exportCatalogSnapshot;
