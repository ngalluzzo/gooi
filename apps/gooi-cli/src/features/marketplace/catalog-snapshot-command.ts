import { exportMarketplaceCatalogSnapshot } from "@gooi/app-marketplace/catalog";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceCatalogSnapshotCommand = createMarketplaceCommand({
	id: "marketplace catalog snapshot",
	summary: "Export marketplace catalog snapshot payload.",
	operation: (input) => exportMarketplaceCatalogSnapshot(input as never),
});
