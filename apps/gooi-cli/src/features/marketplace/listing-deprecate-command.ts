import { deprecateMarketplaceListing } from "@gooi/app-marketplace/listing";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceListingDeprecateCommand = createMarketplaceCommand({
	id: "marketplace listing deprecate",
	summary: "Deprecate one marketplace listing release.",
	operation: (input) => deprecateMarketplaceListing(input as never),
});
