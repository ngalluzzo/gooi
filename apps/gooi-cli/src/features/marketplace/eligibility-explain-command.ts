import { explainProviderEligibility } from "@gooi/app-marketplace/eligibility";
import { createMarketplaceCommand } from "./execute-marketplace-command";

export const marketplaceEligibilityExplainCommand = createMarketplaceCommand({
	id: "marketplace eligibility explain",
	summary:
		"Explain provider eligibility decisions for required certifications.",
	operation: (input) => explainProviderEligibility(input as never),
});
