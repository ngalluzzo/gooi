import { getMarketplaceCatalogDetail } from "@gooi/app-marketplace/catalog";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceCatalogDetailCommand = createMarketplaceCommand({
	id: "marketplace catalog detail",
	summary: "Get one marketplace catalog entry detail.",
	operation: (input) => getMarketplaceCatalogDetail(input as never),
});
