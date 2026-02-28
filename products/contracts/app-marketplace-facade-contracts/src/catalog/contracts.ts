/**
 * Canonical boundary contract API.
 */
import * as catalog from "./catalog";

export type {
	MarketplaceCatalogDetailInput,
	MarketplaceCatalogDetailResult,
	MarketplaceCatalogEntry,
	MarketplaceCatalogSearchInput,
	MarketplaceCatalogSearchQuery,
	MarketplaceCatalogSearchResult,
	MarketplaceCatalogSearchView,
	MarketplaceCatalogSnapshot,
	MarketplaceCatalogSnapshotExportInput,
	MarketplaceCatalogSnapshotResult,
} from "./catalog";

export const catalogContracts = Object.freeze({
	searchMarketplaceCatalog: catalog.searchMarketplaceCatalog,
	getMarketplaceCatalogDetail: catalog.getMarketplaceCatalogDetail,
	exportMarketplaceCatalogSnapshot: catalog.exportMarketplaceCatalogSnapshot,
});
