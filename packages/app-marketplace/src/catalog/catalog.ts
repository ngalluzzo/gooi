import {
	catalogContracts,
	type MarketplaceCatalogDetailInput,
	type MarketplaceCatalogDetailResult,
	type MarketplaceCatalogSearchInput,
	type MarketplaceCatalogSearchResult,
	type MarketplaceCatalogSnapshotExportInput,
	type MarketplaceCatalogSnapshotResult,
} from "@gooi/app-marketplace-facade-contracts/catalog";

export const searchMarketplaceCatalog = (
	input: MarketplaceCatalogSearchInput,
): MarketplaceCatalogSearchResult => {
	return catalogContracts.searchMarketplaceCatalog(input);
};

export const getMarketplaceCatalogDetail = (
	input: MarketplaceCatalogDetailInput,
): MarketplaceCatalogDetailResult => {
	return catalogContracts.getMarketplaceCatalogDetail(input);
};

export const exportMarketplaceCatalogSnapshot = (
	input: MarketplaceCatalogSnapshotExportInput,
): MarketplaceCatalogSnapshotResult => {
	return catalogContracts.exportMarketplaceCatalogSnapshot(input);
};
