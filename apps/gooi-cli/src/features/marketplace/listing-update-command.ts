import { updateMarketplaceListing } from "@gooi/app-marketplace/listing";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceListingUpdateCommand = createMarketplaceCommand({
	id: "marketplace listing update",
	summary: "Update one marketplace listing release.",
	operation: (input) => updateMarketplaceListing(input as never),
});
