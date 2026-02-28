import { createCatalogError } from "./errors";
import { type CatalogDetailResult, catalogDetailInputSchema } from "./model";

export const getCatalogDetail = (value: unknown): CatalogDetailResult => {
	const parsedInput = catalogDetailInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createCatalogError(
				"catalog_schema_error",
				"Catalog detail input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const item = parsedInput.data.state.listings.find((listing) => {
		return (
			listing.providerId === parsedInput.data.providerId &&
			listing.providerVersion === parsedInput.data.providerVersion
		);
	});
	if (item === undefined) {
		return {
			ok: false,
			error: createCatalogError(
				"catalog_not_found_error",
				"Catalog entry was not found for requested provider release.",
			),
		};
	}
	return {
		ok: true,
		item,
	};
};
