import { discoverProviders } from "@gooi/app-marketplace/discover";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceDiscoverCommand = createMarketplaceCommand({
	id: "marketplace discover",
	summary: "Discover providers from catalog-compatible input.",
	operation: (input) => discoverProviders(input as never),
});
