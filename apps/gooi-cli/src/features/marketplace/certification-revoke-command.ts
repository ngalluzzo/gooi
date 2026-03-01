import { revokeMarketplaceCertification } from "@gooi/app-marketplace/certification";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceCertificationRevokeCommand = createMarketplaceCommand({
	id: "marketplace certification revoke",
	summary: "Revoke marketplace certification lifecycle for one provider.",
	operation: (input) => revokeMarketplaceCertification(input as never),
});
