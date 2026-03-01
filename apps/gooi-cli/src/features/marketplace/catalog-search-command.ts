import { searchMarketplaceCatalog } from "@gooi/app-marketplace/catalog";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceCatalogSearchCommand = createMarketplaceCommand({
	id: "marketplace catalog search",
	summary: "Search marketplace catalog entries.",
	operation: (input) => searchMarketplaceCatalog(input as never),
});
