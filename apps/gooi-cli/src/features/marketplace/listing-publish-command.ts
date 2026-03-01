import { publishMarketplaceListing } from "@gooi/app-marketplace/listing";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceListingPublishCommand = createMarketplaceCommand({
	id: "marketplace listing publish",
	summary: "Publish one marketplace listing release.",
	operation: (input) => publishMarketplaceListing(input as never),
});
