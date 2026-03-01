import { resolveTrustedProviders } from "@gooi/app-marketplace/resolve";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceResolveCommand = createMarketplaceCommand({
	id: "marketplace resolve",
	summary: "Resolve trusted providers from resolver input.",
	operation: (input) => resolveTrustedProviders(input as never),
});
