import { startMarketplaceCertification } from "@gooi/app-marketplace/certification";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceCertificationStartCommand = createMarketplaceCommand({
	id: "marketplace certification start",
	summary: "Start marketplace certification lifecycle for one provider.",
	operation: (input) => startMarketplaceCertification(input as never),
});
