import { completeMarketplaceCertification } from "@gooi/app-marketplace/certification";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceCertificationCompleteCommand = createMarketplaceCommand(
	{
		id: "marketplace certification complete",
		summary: "Complete marketplace certification lifecycle for one provider.",
		operation: (input) => completeMarketplaceCertification(input as never),
	},
);
