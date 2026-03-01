import type { CliCommand } from "../../shared/command";

type MarketplaceOperation = (input: unknown) => unknown;

export const createMarketplaceCommand = (input: {
	readonly id: string;
	readonly summary: string;
	readonly operation: MarketplaceOperation;
}): CliCommand => ({
	id: input.id,
	summary: input.summary,
	run: async (context) => {
		const payload = await context.readJsonInput();
		return input.operation(payload);
	},
});
